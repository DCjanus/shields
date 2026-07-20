const githubTokenScopes = Object.freeze({
  readPackages: 'read:packages',
})

const requestedGithubTokenScopes = Object.freeze([
  githubTokenScopes.readPackages,
])

export { githubTokenScopes, requestedGithubTokenScopes }
