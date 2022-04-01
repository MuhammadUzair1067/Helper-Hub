const { parseMultipartData, sanitizeEntity } = require('strapi-utils');

/**
 * Read the documentation (https://strapi.io/documentation/developer-docs/latest/development/backend-customization.html#core-controllers)
 * to customize this controller
 */

module.exports = {
  async create(ctx) {
    const {available,startTime,endTime,days} = ctx.request.body;
    const {id} = ctx.state.user;

    let entity;
      try {

        const cleaner = await strapi.services.cleaner.findOne({user:id});
        if(cleaner){
          if(cleaner.schedule){
            entity = await strapi.services.schedule.update({id:cleaner.schedule.id},{
              available,
              startTime,
              endTime,
              days,
              cleaner:cleaner.id
            });
            return sanitizeEntity(entity, { model: strapi.models.schedule });
          }else{
            entity = await strapi.services.schedule.create({
              available,
              startTime,
              endTime,
              days,
              cleaner:cleaner.id
            });
            return sanitizeEntity(entity, { model: strapi.models.schedule });
          }
        }
        return ctx.badRequest('cleaner does not exist');
      } catch (error) {
        return ctx.badRequest(error);
      }
  }
}
