import { Inject } from '@nestjs/common';
import type { Knex } from 'knex';
import { KNEX } from './database.constants.js';

/** Columns every table has (see migrations). */
export interface BaseEntity {
  id: string;
  created_at: Date;
  updated_at: Date;
}

/** Data needed to insert a row: everything except the DB-generated columns. */
export type InsertData<T extends BaseEntity> = Omit<T, keyof BaseEntity>;

/** Data allowed in an update: any subset of the non-generated columns. */
export type UpdateData<T extends BaseEntity> = Partial<InsertData<T>>;

/** Either the root Knex instance or a transaction, so every method can run inside a transaction. */
export type Executor = Knex | Knex.Transaction;

/**
 * Generic CRUD for one table.
 *
 * - `T` is the full row as stored in the DB.
 * - `R` is the row as returned by these methods; set it when `columns` hides
 *   sensitive fields (e.g. `BaseRepository<IUser, PublicUser>` without `password_hash`).
 *
 * Subclasses set `table` (and optionally `columns`) and add table-specific queries.
 */
export abstract class BaseRepository<T extends BaseEntity, R = T> {
  @Inject(KNEX) protected readonly db: Knex;

  protected abstract readonly table: string;

  /** Columns selected and returned by the methods below. Override to hide columns. */
  protected readonly columns: readonly string[] | '*' = '*';

  /** Query builder for this table, optionally bound to a transaction. */
  protected query(trx?: Executor) {
    return (trx ?? this.db)(this.table);
  }

  private get returning(): string | string[] {
    return this.columns === '*' ? '*' : [...this.columns];
  }

  async findById(id: string, trx?: Executor): Promise<R | undefined> {
    return this.query(trx).select(this.returning).where({ id }).first();
  }

  async findOne(where: Partial<T>, trx?: Executor): Promise<R | undefined> {
    return this.query(trx).select(this.returning).where(where).first();
  }

  async findAll(where: Partial<T> = {}, trx?: Executor): Promise<R[]> {
    return this.query(trx).select(this.returning).where(where).orderBy('created_at', 'desc');
  }

  async exists(where: Partial<T>, trx?: Executor): Promise<boolean> {
    const row = await this.query(trx).select('id').where(where).first();
    return row !== undefined;
  }

  async insert(data: InsertData<T>, trx?: Executor): Promise<R> {
    const [row] = await this.query(trx).insert(data).returning(this.returning);
    return row;
  }

  /** Returns the updated row, or `undefined` if no row has this id. */
  async update(id: string, data: UpdateData<T>, trx?: Executor): Promise<R | undefined> {
    const [row] = await this.query(trx)
      .where({ id })
      .update({ ...data, updated_at: this.db.fn.now() })
      .returning(this.returning);
    return row;
  }

  /** Returns `true` if a row was deleted. */
  async delete(id: string, trx?: Executor): Promise<boolean> {
    const count = await this.query(trx).where({ id }).delete();
    return count > 0;
  }
}
