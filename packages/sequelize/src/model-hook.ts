import { default as _ } from 'lodash';
import { SequelizeHooks } from 'sequelize/types/hooks';

import Sequelize from './sequelize';
import { Model } from './model';

const { hooks } = require('sequelize/lib/hooks');

export class ModelHook {
  database: Sequelize;

  boundEvents = new Set<string>();

  constructor(database: Sequelize) {
    this.database = database;
  }

  match(event: string | symbol): keyof SequelizeHooks | null {
    // NOTE: skip Symbol event
    if (!_.isString(event)) {
      return null;
    }

    const type = event.split('.').pop();

    return type in hooks ? <keyof SequelizeHooks>type : null;
  }

  findModelName(hookArgs) {
    for (let arg of hookArgs) {
      if (Array.isArray(arg)) {
        arg = arg[0];
      }
      if (arg?._previousDataValues) {
        return (<Model>arg).constructor.name;
      }
      if (_.isPlainObject(arg)) {
        if (arg['model']) {
          return arg['model'].name;
        }

        const modelName = arg['modelName'];
        if (this.database.sequelize.isDefined(modelName)) {
          return modelName;
        }
      }
    }
    return null;
  }

  bindEvent(type) {
    this.boundEvents.add(type);
  }

  hasBoundEvent(type): boolean {
    return this.boundEvents.has(type);
  }

  buildSequelizeHook(type) {
    return async (...args: any[]) => {
      const modelName = this.findModelName(args);

      if (modelName) {
        // emit model event
        await this.database.emitAsync(`${modelName}.${type}`, ...args);
      }

      // emit sequelize global event
      await this.database.emitAsync(type, ...args);
    };
  }
}
