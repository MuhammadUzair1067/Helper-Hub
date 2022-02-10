module.exports = ({ env }) => ({
  upload: {
    provider: 'aws-s3',
    providerOptions: {
      accessKeyId: env('AWS_ACCESS_KEY_ID'),
      secretAccessKey: env('AWS_SECRET_ACCESS_KEY'),
      region: 'us-west-1',
      params: {
        Bucket: 'wandimages',
      },
    },
  },
  email: {
    provider: 'sendgrid',
    providerOptions: {
      apiKey: env('SENDGRID_API_KEY'),
    },
    settings: {
      defaultFrom: 'support@wandusa.com',
      defaultReplyTo: 'support@wandusa.com',
    },
  },
});