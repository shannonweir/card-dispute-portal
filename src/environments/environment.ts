export const environment = {
  production: true,
  apiBaseUrl: '/api/v1',
  mockApiEnabled: false,
  mockAuthEnabled: false,
  auth0: {
    domain: 'dev-1fnyw5sg2ehum1ph.us.auth0.com',
    clientId: 'p0c2ysKMd7Swg8XMqQwpa4kt5jVxsMwT',
    audience: 'https://api.carddisputeportal.local',
    redirectUri: window.location.origin,
    logoutRedirectUri: window.location.origin,
  },
} as const;
