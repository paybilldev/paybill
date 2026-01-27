import { default as _ } from 'lodash';
import * as flat from 'flat';

type Values = Record<string, any>;

export function valuesToFilter(values: Values = {}, filterKeys: Array<string>) {
  const removeArrayIndexInKey = (key) => {
    const chunks = key.split('.');
    return chunks
      .filter((chunk) => {
        return !chunk.match(/\d+/);
      })
      .join('.');
  };

  const filterAnd = [];
  const flattedValues = flat.flatten(values) as Record<string, any>;;
  const flattedValuesObject = {};

  for (const key in flattedValues) {
    const keyWithoutArrayIndex = removeArrayIndexInKey(key);
    if (flattedValuesObject[keyWithoutArrayIndex]) {
      if (!Array.isArray(flattedValuesObject[keyWithoutArrayIndex])) {
        flattedValuesObject[keyWithoutArrayIndex] = [flattedValuesObject[keyWithoutArrayIndex]];
      }

      flattedValuesObject[keyWithoutArrayIndex].push(flattedValues[key]);
    } else {
      flattedValuesObject[keyWithoutArrayIndex] = [flattedValues[key]];
    }
  }

  for (const filterKey of filterKeys) {
    const filterValue = flattedValuesObject[filterKey] ? flattedValuesObject[filterKey] : _.get(values, filterKey);

    if (filterValue) {
      filterAnd.push({
        [filterKey]: filterValue,
      });
    } else {
      filterAnd.push({
        [filterKey]: null,
      });
    }
  }

  return {
    $and: filterAnd,
  };
}
