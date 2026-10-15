const Joi = require('joi');

const schema = Joi.object({
  displayName: Joi.string().min(1).max(50),
  bio: Joi.string().max(300).allow(''),
  isPrivate: Joi.boolean(),
}).min(1);

const payload = { displayName: 'Milind', bio: '' };

const { error } = schema.validate(payload);
if (error) {
  console.log('Validation Error:', error.details);
} else {
  console.log('Passed!');
}
