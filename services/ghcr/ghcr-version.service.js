import Joi from 'joi'
import { matcher } from 'matcher'
import { latest, renderVersionBadge } from '../version.js'
import { BaseJsonService, NotFound, pathParams, queryParams } from '../index.js'

const tokenSchema = Joi.object({
  token: Joi.string().required(),
}).required()

const tagsSchema = Joi.object({
  name: Joi.string().required(),
  tags: Joi.array().items(Joi.string()).required(),
}).required()

const queryParamSchema = Joi.object({
  ignore: Joi.string().default('latest'),
  include_prereleases: Joi.equal(''),
}).required()

const openApiQueryParams = queryParams(
  {
    name: 'ignore',
    example: 'latest,master,sha256*',
    description:
      'Comma-separated list of tag patterns to ignore before selecting the latest version.',
  },
  {
    name: 'include_prereleases',
    example: null,
    schema: { type: 'boolean' },
  },
)

export default class GhcrVersion extends BaseJsonService {
  static category = 'version'
  static route = {
    base: 'ghcr/v',
    pattern: ':owner/:image+',
    queryParamSchema,
  }

  static openApi = {
    '/ghcr/v/{owner}/{image}': {
      get: {
        summary: 'GitHub Container Registry Image Version',
        parameters: [
          ...pathParams(
            { name: 'owner', example: 'badges' },
            { name: 'image', example: 'shields' },
          ),
          ...openApiQueryParams,
        ],
      },
    },
  }

  static _cacheLength = 900

  static defaultBadgeData = { label: 'version', color: 'blue' }

  static applyIgnoredTags({ tags, ignore }) {
    const ignoredPatterns = ignore.split(',').filter(Boolean)
    if (ignoredPatterns.length === 0) {
      return tags
    }
    return tags.filter(tag => matcher([tag], ignoredPatterns).length === 0)
  }

  static selectVersion({ tags, includePrereleases }) {
    return latest(tags, { pre: includePrereleases })
  }

  async fetchToken({ owner, image }) {
    return this._requestJson({
      schema: tokenSchema,
      url: 'https://ghcr.io/token',
      options: { searchParams: { scope: `repository:${owner}/${image}:pull` } },
      httpErrors: { 404: 'package not found' },
    })
  }

  async fetchTags({ owner, image, token }) {
    return this._requestJson({
      schema: tagsSchema,
      url: `https://ghcr.io/v2/${owner}/${image}/tags/list`,
      options: {
        headers: {
          Accept: 'application/json',
          Authorization: `Bearer ${token}`,
        },
        searchParams: { n: 1000 },
      },
      httpErrors: {
        401: 'package not found',
        404: 'package not found',
      },
    })
  }

  async handle({ owner, image }, { ignore, include_prereleases: includePre }) {
    const { token } = await this.fetchToken({ owner, image })
    const { tags } = await this.fetchTags({ owner, image, token })
    const filteredTags = this.constructor.applyIgnoredTags({ tags, ignore })
    if (filteredTags.length === 0) {
      throw new NotFound({ prettyMessage: 'no matching tags found' })
    }

    return renderVersionBadge({
      version: this.constructor.selectVersion({
        tags: filteredTags,
        includePrereleases: includePre !== undefined,
      }),
    })
  }
}
