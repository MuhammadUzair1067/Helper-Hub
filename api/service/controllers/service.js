const { parseMultipartData, sanitizeEntity } = require('strapi-utils');
const  axios = require('axios');

/**
 * Read the documentation (https://strapi.io/documentation/developer-docs/latest/development/backend-customization.html#core-controllers)
 * to customize this controller
 */

module.exports = {
  async create(ctx){
    let entity;
    const {id} = ctx.state.user;
    const {bathroomDuration, kitchenDuration,bedroomDuration,livingroomDuration,ratePerHour} = ctx.request.body;
    try {
      const cleaner = await strapi.services.cleaner.findOne({user:id});
      if(cleaner){
        if(cleaner.service){
          entity = await strapi.services.service.update({id:cleaner.service.id},{
            bathroomDuration, 
            kitchenDuration,
            bedroomDuration,
            livingroomDuration,
            ratePerHour,
            cleaner: cleaner.id
          })
          return sanitizeEntity(entity, { model: strapi.models.service });
        }else{
          entity = await strapi.services.service.create({
            bathroomDuration, 
            kitchenDuration,
            bedroomDuration,
            livingroomDuration,
            ratePerHour,
            cleaner: cleaner.id
          })
          return sanitizeEntity(entity, { model: strapi.models.service });
        }
      }
      return ctx.badRequest('cleaner does not exist');
    } catch (error) {
      return ctx.badRequest(error);
    }
  }
};
