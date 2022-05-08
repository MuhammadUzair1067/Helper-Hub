module.exports = {
  settings: {
    cors: {
      origin:['http://localhost:1337','http://localhost:3001','http://app.wandcleaning.pro']
    },
    parser: {
      enabled: true,
      multipart: true,
      includeUnparsed: true,
    },
  },
};