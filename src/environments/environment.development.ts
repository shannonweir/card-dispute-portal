export const environment = {
  production: false,
  apiBaseUrl: '/api/v1',
  mockApiEnabled: false,
  mockAuthEnabled: false,
  auth0: {
    domain: 'dev-1fnyw5sg2ehum1ph.us.auth0.com',
    clientId: 'p0c2ysKMd7Swg8XMqQwpa4kt5jVxsMwT',
    audience: 'https://api.carddisputeportal.local',
    redirectUri: 'http://localhost:4200',
    logoutRedirectUri: 'http://localhost:4200',
  },
} as const;
