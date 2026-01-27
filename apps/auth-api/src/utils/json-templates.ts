import * as _ from 'lodash';

type ValueType =
  | 'string'
  | 'number'
  | 'boolean'
  | 'object'
  | 'array'
  | 'date'
  | 'null'
  | 'undefined'
  | 'function';

interface ParameterDescriptor {
  key: string;
  defaultValue?: string;
}

interface TemplateFunction<T = any> {
  (context?: Record<string, any>): T;
  parameters: ParameterDescriptor[];
}

// An enhanced version of `typeof` that handles arrays and dates as well.
function type(value: unknown): ValueType {
  let valueType = typeof value as ValueType;

  if (Array.isArray(value)) {
    valueType = 'array';
  } else if (value instanceof Date) {
    valueType = 'date';
  } else if (value === null) {
    valueType = 'null';
  }

  return valueType;
}

// Constructs a parameter object from a match result.
function Parameter(match: string): ParameterDescriptor {
  const matchValue = match.substr(2, match.length - 4).trim();
  const i = matchValue.indexOf(':');

  if (i !== -1) {
    return {
      key: matchValue.substr(0, i),
      defaultValue: matchValue.substr(i + 1),
    };
  }

  return {key: matchValue};
}

// Constructs a template function with deduped `parameters` property.
function Template<T>(
  fn: (context?: Record<string, any>) => T,
  parameters: ParameterDescriptor[],
): TemplateFunction<T> {
  (fn as TemplateFunction<T>).parameters = Array.from(
    new Map(parameters.map(parameter => [parameter.key, parameter])).values(),
  );
  return fn as TemplateFunction<T>;
}

// Parses the given template object.
export function parse(value: any): TemplateFunction {
  switch (type(value)) {
    case 'string':
      return parseString(value);
    case 'object':
      return parseObject(value);
    case 'array':
      return parseArray(value);
    default:
      return Template(() => value, []);
  }
}

// Parses leaf nodes of the template object that are strings.
const parseString = (() => {
  const regex = /{{(\w|:|[\s-+.,@/()?=*_$])+}}/g;

  return (str: string): TemplateFunction<any> => {
    let parameters: ParameterDescriptor[] = [];
    let templateFn: (context?: Record<string, any>) => any = () => str;

    const matches = str.match(regex);
    if (matches) {
      parameters = matches.map(Parameter);

      templateFn = (context = {}) => {
        return matches.reduce((result, match, i) => {
          const parameter = parameters[i]!;
          let value = _.get(context, parameter.key);

          if (typeof value === 'undefined') {
            value = parameter.defaultValue;
          }

          if (typeof value === 'function') {
            value = value();
          }

          if (
            matches.length === 1 &&
            str.startsWith('{{') &&
            str.endsWith('}}')
          ) {
            return value;
          }

          if (value instanceof Date) {
            value = value.toISOString();
          }

          return result.replace(match, value == null ? '' : String(value));
        }, str);
      };
    }

    return Template(templateFn, parameters);
  };
})();

// Parses non-leaf-nodes in the template object that are objects.
function parseObject(
  object: Record<string, any>,
): TemplateFunction<Record<string, any>> {
  const children = Object.keys(object).map(key => ({
    keyTemplate: parseString(key),
    valueTemplate: parse(object[key]),
  }));

  const templateParameters = children.reduce<ParameterDescriptor[]>(
    (parameters, child) =>
      parameters.concat(
        child.valueTemplate.parameters,
        child.keyTemplate.parameters,
      ),
    [],
  );

  const templateFn = (context?: Record<string, any>) => {
    return children.reduce<Record<string, any>>((newObject, child) => {
      newObject[child.keyTemplate(context)] = child.valueTemplate(context);
      return newObject;
    }, {});
  };

  return Template(templateFn, templateParameters);
}

// Parses non-leaf-nodes in the template object that are arrays.
function parseArray(array: any[]): TemplateFunction<any[]> {
  const templates = array.map(parse);

  const templateParameters = templates.reduce<ParameterDescriptor[]>(
    (parameters, template) => parameters.concat(template.parameters),
    [],
  );

  const templateFn = (context?: Record<string, any>) =>
    templates.map(template => template(context));

  return Template(templateFn, templateParameters);
}
