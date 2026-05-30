import { test, given } from 'sazerac'
import GhcrVersion from './ghcr-version.service.js'

describe('GhcrVersion', function () {
  test(GhcrVersion.applyIgnoredTags, () => {
    const tags = ['latest', 'master', 'sha256-abc.sig', 'v1.0.0', 'v1.1.0']
    given({ tags, ignore: 'latest' }).expect([
      'master',
      'sha256-abc.sig',
      'v1.0.0',
      'v1.1.0',
    ])
    given({ tags, ignore: 'latest,master,sha256*' }).expect([
      'v1.0.0',
      'v1.1.0',
    ])
    given({ tags, ignore: '' }).expect(tags)
  })

  test(GhcrVersion.selectVersion, () => {
    given({
      tags: ['latest', 'v1.0.0', 'v1.1.0', 'v1.2.0-rc.1'],
      includePrereleases: false,
    }).expect('v1.1.0')
    given({
      tags: ['latest', 'v1.0.0', 'v1.1.0', 'v1.2.0-rc.1'],
      includePrereleases: true,
    }).expect('v1.2.0-rc.1')
  })
})
