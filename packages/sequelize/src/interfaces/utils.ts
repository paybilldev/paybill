import Sequelize from '../sequelize';
import {
  BooleanInterface,
  DateInterface,
  DatetimeInterface,
  DatetimeNoTzInterface,
  MultipleSelectInterface,
  PercentInterface,
  SelectInterface,
  TextareaInterface,
  TimeInterface,
} from './index';
import { ManyToOneInterface } from './many-to-one-interface';
import { ManyToManyInterface } from './many-to-many-interface';
import { OneHasOneInterface } from './one-has-one-interface';
import { OneBelongsToOneInterface } from './one-belongs-to-one-interface';
import { OneToManyInterface } from './one-to-many-interface';
import { IntegerInterface } from './integer-interface';
import { NumberInterface } from './number-interface';
import { JsonInterface } from './json-interface';
import { InputInterface } from './input-interface';

const interfaces = {
  integer: IntegerInterface,
  number: NumberInterface,
  multipleSelect: MultipleSelectInterface,
  checkboxes: MultipleSelectInterface,
  checkboxGroup: MultipleSelectInterface,
  checkbox: BooleanInterface,
  select: SelectInterface,
  radio: SelectInterface,
  radioGroup: SelectInterface,
  percent: PercentInterface,
  datetime: DatetimeInterface,
  datetimeNoTz: DatetimeNoTzInterface,
  unixTimestamp: DatetimeInterface,
  date: DateInterface,
  created_at: DatetimeInterface,
  updated_at: DatetimeInterface,
  boolean: BooleanInterface,
  json: JsonInterface,
  oho: OneHasOneInterface,
  obo: OneBelongsToOneInterface,
  o2m: OneToManyInterface,
  m2o: ManyToOneInterface,
  m2m: ManyToManyInterface,
  time: TimeInterface,
  input: InputInterface,
  textarea: TextareaInterface,
};

export function registerInterfaces(db: Sequelize) {
  for (const [interfaceName, type] of Object.entries(interfaces)) {
    db.interfaceManager.registerInterfaceType(interfaceName, type);
  }
}
