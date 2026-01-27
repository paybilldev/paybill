import Joi, { AnySchema, Root } from 'joi';
import { ValidationOptions } from '../fields';
import _ from 'lodash';

export function buildJoiSchema(validation: ValidationOptions, options: { label?: string; value: string }): AnySchema {
  const { type, rules } = validation;
  const { label, value } = options;

  if (!type || typeof type !== 'string' || !(type in Joi)) {
    throw new Error(`Invalid validation type: "${type}". Type must be a valid Joi schema type.`);
  }

  let schema = Joi[type]();

  const isRequired = rules.some((rule) => rule.name === 'required');

  if (isRequired) {
    schema = schema.empty(null);
  } else {
    schema = schema.allow(null, '');
    if ([null, ''].includes(value)) return schema;
  }

  if (rules) {
    rules.forEach((rule) => {
      if (!_.isEmpty(rule.args)) {
        if (rule.name === 'pattern' && !_.isRegExp(rule.args.regex)) {
          const lastSlash = rule.args.regex.lastIndexOf('/');
          const isRegExpStr = rule.args.regex.startsWith('/') && lastSlash > 0;
          if (isRegExpStr) {
            rule.args.regex = rule.args.regex.slice(1, lastSlash);
          }
          rule.args.regex = new RegExp(rule.args.regex);
        }
        schema =
          rule.paramsType === 'object' ? schema[rule.name](rule.args) : schema[rule.name](...Object.values(rule.args));
      } else {
        schema = schema[rule.name]();
      }
    });
  }

  if (label) {
    schema = schema.label(label);
  }

  return schema;
}
