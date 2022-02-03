const { parseMultipartData, sanitizeEntity } = require('strapi-utils');
const  axios = require('axios');
const stripe = require("stripe")("sk_test_TJ0xZiLwb8VtmVn9beNRsDFh00rLP48kV5");
/**
 * Read the documentation (https://strapi.io/documentation/developer-docs/latest/development/backend-customization.html#core-controllers)
 * to customize this controller
 */

module.exports = {
  async payStripe(ctx){
    try {
      const amount = 2000; // lowest denomination
      const paymentIntent = await stripe.paymentIntents.create({
        amount,
        currency: "inr",
        payment_method_types: ["card"],
        metadata: {
          name: "value",
        },
      });
      const clientSecret = paymentIntent.client_secret;
      // const status = paymentIntent.status;
      res.json({ clientSecret, message: "Payment Initiated" });
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: "Internal server error" });
    }
  }
};
