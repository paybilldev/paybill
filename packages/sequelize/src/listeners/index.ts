import { Sequelize } from '../sequelize';
import { beforeDefineAdjacencyListCollection } from './adjacency-list';
import { appendChildCollectionNameAfterRepositoryFind } from './append-child-collection-name-after-repository-find';

export const registerBuiltInListeners = (db: Sequelize) => {
  db.on('beforeDefineCollection', beforeDefineAdjacencyListCollection);
  db.on('afterRepositoryFind', appendChildCollectionNameAfterRepositoryFind(db));
};
