import { isSemver } from '../test-validators.js'
import { createServiceTester } from '../tester.js'

export const t = await createServiceTester()

t.create('ghcr version (live)').get('/eggplants/ghcr-badge.json').expectBadge({
  label: 'version',
  message: isSemver,
})

t.create('ghcr version')
  .get('/owner/image.json')
  .intercept(nock => {
    nock('https://ghcr.io')
      .get('/token')
      .query({ scope: 'repository:owner/image:pull' })
      .reply(200, { token: 'abc123' })

    return nock('https://ghcr.io', {
      reqheaders: { authorization: 'Bearer abc123' },
    })
      .get('/v2/owner/image/tags/list')
      .query({ n: '1000' })
      .reply(200, {
        name: 'owner/image',
        tags: ['latest', 'v1.0.0', 'v1.1.0'],
      })
  })
  .expectBadge({ label: 'version', message: 'v1.1.0' })

t.create('ghcr version (ignore patterns)')
  .get('/owner/image.json?ignore=latest,v1.1*')
  .intercept(nock => {
    nock('https://ghcr.io')
      .get('/token')
      .query({ scope: 'repository:owner/image:pull' })
      .reply(200, { token: 'abc123' })

    return nock('https://ghcr.io')
      .get('/v2/owner/image/tags/list')
      .query({ n: '1000' })
      .reply(200, {
        name: 'owner/image',
        tags: ['latest', 'v1.0.0', 'v1.1.0'],
      })
  })
  .expectBadge({ label: 'version', message: 'v1.0.0' })

t.create('ghcr version (not found)')
  .get('/owner/not-a-package.json')
  .intercept(nock => {
    nock('https://ghcr.io')
      .get('/token')
      .query({ scope: 'repository:owner/not-a-package:pull' })
      .reply(200, { token: 'abc123' })

    return nock('https://ghcr.io')
      .get('/v2/owner/not-a-package/tags/list')
      .query({ n: '1000' })
      .reply(404)
  })
  .expectBadge({ label: 'version', message: 'package not found' })
