const Joi = require("joi");
exports.addUserValidator = {
  body: Joi.object()
    .required()
    .keys({
      name: Joi.string().required().messages({
        "string.empty": "you have to enter the name",
      }),
      email: Joi.string()
        .email({ minDomainSegments: 2, tlds: { allow: ["com", "net"] } })
        .required()
        .messages({
          "string.email": "this is wrong email",
        }),
      password: Joi.string().required().messages({
        "string.empty": "you have to enter password",
      }),
    }),
};
exports.loginValidator = {
  body: Joi.object()
    .required()
    .keys({
      email: Joi.string()
        .email({ minDomainSegments: 2, tlds: { allow: ["com", "net"] } })
        .required()
        .messages({
          "string.email": "this is wrong email",
        }),
      password: Joi.string().required().messages({
        "string.empty": "you have to enter password",
      }),
    }),
};
