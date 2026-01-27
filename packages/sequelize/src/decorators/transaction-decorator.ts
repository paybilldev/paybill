import { default as _ } from 'lodash';

export function transactionWrapperBuilder(transactionGenerator) {
  return function transaction(transactionInjector?) {
    return (target, name, descriptor) => {
      const oldValue = descriptor.value;

      descriptor.value = async function () {
        let transaction;
        let newTransaction = false;

        if (arguments.length > 0 && typeof arguments[0] === 'object') {
          transaction = arguments[0]['transaction'];
        }

        if (!transaction) {
          transaction = await transactionGenerator.apply(this);
          newTransaction = true;
        }

        transaction.afterCommit(() => {
          if (transaction.eventCleanupBinded) {
            return;
          }

          transaction.eventCleanupBinded = true;
          if (this.database) {
            this.database.removeAllListeners(`transactionRollback:${transaction.id}`);
          }
        });

        if (newTransaction) {
          try {
            let callArguments;
            if (_.isPlainObject(arguments[0])) {
              callArguments = {
                ...arguments[0],
                transaction,
              };
            } else if (transactionInjector) {
              callArguments = transactionInjector(arguments, transaction);
            } else if (_.isNull(arguments[0]) || _.isUndefined(arguments[0])) {
              callArguments = {
                transaction,
              };
            } else {
              throw new Error(`please provide transactionInjector for ${name} call`);
            }

            const results = await oldValue.call(this, callArguments);

            await transaction.commit();

            return results;
          } catch (err) {
            console.error(err);
            await transaction.rollback();

            if (this.database) {
              await this.database.emitAsync(`transactionRollback:${transaction.id}`);
              await this.database.removeAllListeners(`transactionRollback:${transaction.id}`);
            }
            throw err;
          }
        } else {
          return oldValue.apply(this, arguments);
        }
      };

      return descriptor;
    };
  };
}
