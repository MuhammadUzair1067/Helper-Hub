const { parseMultipartData, sanitizeEntity } = require('strapi-utils');

module.exports = {

  async create(ctx) {
    let entity;
    try {
      if (ctx.is('multipart')) {
        const { data, files } = parseMultipartData(ctx);
        entity = await strapi.services.business.create(data, { files });
      } else {
        entity = await strapi.services.business.create(ctx.request.body);
      }
      return sanitizeEntity(entity, { model: strapi.models.business });
    } catch (error) {
      console.log(error)
      return ctx.badRequest(error);
    }
  },
  async update(ctx) {
    let entity;
    try {
      if (ctx.is('multipart')) {
        const { data, files } = parseMultipartData(ctx);
        entity = await strapi.services.business.create(data, { files });
      } else {
        entity = await strapi.services.business.update(
          {id:ctx.params.id},ctx.request.body);
      }
      return sanitizeEntity(entity, { model: strapi.models.business });
    } catch (error) {
      console.log(error)
      return ctx.badRequest(error);
    }
  },
};