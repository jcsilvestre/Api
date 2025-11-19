import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity({ name: 'roles', schema: 'auth' })
export class Role {
  @PrimaryGeneratedColumn() id!: number;
  @Column({ type: 'varchar', length: 50, unique: true }) name!: string;
  @Column({ type: 'text', nullable: true }) description!: string | null;
  @Column({ type: 'jsonb', default: [] }) permissions!: unknown[];
  @Column({ type: 'boolean', default: false }) is_system_role!: boolean;
  @CreateDateColumn({ type: 'timestamptz' }) created_at!: Date;
  @UpdateDateColumn({ type: 'timestamptz' }) updated_at!: Date;
}
