import { NumberInterface } from './number-interface';

export class IntegerInterface extends NumberInterface {
  validate(value): boolean {
    return true;
  }
}
