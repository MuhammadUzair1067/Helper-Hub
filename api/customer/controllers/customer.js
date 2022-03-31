const { parseMultipartData, sanitizeEntity } = require('strapi-utils');
const  axios = require('axios');

/**
 * Read the documentation (https://strapi.io/documentation/developer-docs/latest/development/backend-customization.html#core-controllers)
 * to customize this controller
 */

const formatError = error => [
  { messages: [{ id: error.id, message: error.message, field: error.field }] },
];
module.exports = {
  async create(ctx){
    const cleanerId=ctx.state.user.cleaner;
    let user;
    try {
      const cleaner = await strapi.services.cleaner.findOne({id:cleanerId})
      const {
        firstName,
        lastName,
        phoneNumber,
        email,
        companyName,
        preferredMethod,
        password,
        marketSource,
        billingAddress,
        notes,
        address1,
        address2,
        city,
        region,
        zipCode,
      } = ctx.request.body;
      try {
        user = await axios.post(`${process.env.PUBLIC_URL}auth/local/register`,{
          email,
          username:email,
          password
        });
      } catch (error) {
        return ctx.badRequest(
          formatError({message:'email could be already taken'})
        );
      }

      await strapi.query('user', 'users-permissions').update({ id: user.data.user.id }, { role: process.env.CUSTOMER_ID })

      let entity = await strapi.services.customer.create({
        firstName,
        lastName,
        phoneNumber,
        companyName,
        preferredMethod,
        marketSource,
        billingAddress,
        notes,
        address1,
        address2,
        city,
        region,
        zipCode,
        user:user.data.user.id,
        business:cleaner.business?.id
      })
      return sanitizeEntity(entity, { model: strapi.models.customer });;

    } catch (error) {
      return ctx.badRequest(
        error
      );
    }
  }
};
