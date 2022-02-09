const { parseMultipartData, sanitizeEntity } = require('strapi-utils');
const stripe = require("stripe")("sk_test_51EgE2aEUu08wLGaUGiUyFwriWfKuh0wu95ROSgQMQx9j6J5sfJPhkqUS6kE28dz5OGWQ6TZclVd1wznAlkeoGP2Y00GsmCoesh");


/**
 * Read the documentation (https://strapi.io/documentation/developer-docs/latest/development/backend-customization.html#core-controllers)
 * to customize this controller
 */

module.exports = {
  async connectedAccount(ctx){
    const {email,id} = ctx.state.user;
    let accountID,accountLink;

    try {
      let wallet = await strapi.services.wallet.findOne({cleaner:id})

      if(wallet?.onboarding){
        return {msg1:"already has a wallet",...wallet}
      }

      if(!wallet){
        const account = await stripe.accounts.create({
          type: 'express',
          // country: 'US',
          email,
          settings:{
            payouts: {
              "schedule": {
                "delay_days": 14,
                "interval": "daily"
              }
            }
          }
        });
        accountID = account.id

      }else if(wallet?.connectAccountID){
        accountID = wallet.connectAccountID;
      }

      accountLink = await stripe.accountLinks.create({
        account: accountID,
        refresh_url: `${process.env.DOMAIN_URL}?failure`,
        return_url: `${process.env.DOMAIN_URL}?success`,
        type: 'account_onboarding',
      });

        if(!wallet){
        wallet = await strapi.services.wallet.create(
          {connectAccountID:accountID,cleaner:id})
      }
      const a =  sanitizeEntity(wallet, { model: strapi.models.wallet });
      return {...a,accountLink:accountLink.url}

    } catch (error) {
      return error;
    }
  },
  async update(ctx){
    const {id} = ctx.state.user; 
    try {

      let entity = await strapi.services.wallet.update(
        {cleaner:id},{onboarding:true});

      return sanitizeEntity(entity, { model: strapi.models.wallet });;
    } catch (error) {
      return error;
    }
  },
  async balances(ctx){
    const {id} = ctx.state.user;

    const wallet = await strapi.services.wallet.findOne({cleaner:id,onboarding:true})

    try {
      const balance = await stripe.balance.retrieve({
        stripe_account: wallet.connectAccountID,
      });
      // console.log(balance);
      return balance;
    } catch (error) {
      return error;
    }
  },
  async loginToStripe(ctx){
    const {id} = ctx.state.user;
    try {
      const wallet = await strapi.services.wallet.findOne({cleaner:id})

      const link = await stripe.accounts.createLoginLink(
        wallet.connectAccountID
      );

      return link;
    } catch (error) {
      return error;
    }
  }
};
