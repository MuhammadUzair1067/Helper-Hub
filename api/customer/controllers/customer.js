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
    let user;
    try {
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
        age,
      } = ctx.request.body;
      try {
        let url;
        if(process.env.NODE_ENV==='development'){
          url = process.env.PUBLIC_URL_LOCAL
        }else{
          url = process.env.PUBLIC_URL
        }
        user = await axios.post(`${url}auth/local/register`,{
          email,
          username:email,
          password
        });
      } catch (error) {
        console.log(error)
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
        age,
        user:user.data.user.id,
      })
      return sanitizeEntity(entity, { model: strapi.models.customer });;

    } catch (error) {
      console.log(error)
      return ctx.badRequest(
        error
      );
    }
  }
};
