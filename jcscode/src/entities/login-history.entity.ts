import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity({ name: 'login_history', schema: 'auth' })
export class LoginHistory {
  @PrimaryGeneratedColumn('increment') id!: number;
  @Column({ type: 'uuid', nullable: true }) user_id!: string | null;
  @Column({ type: 'varchar', length: 50 }) action!: string;
  @Column({ type: 'varchar', length: 20 }) status!: string;
  @Column({ type: 'varchar', length: 50, nullable: true }) auth_method!:
    | string
    | null;
  @Column({ type: 'varchar', length: 100, nullable: true }) failure_reason!:
    | string
    | null;
  @Column({ type: 'inet' }) ip_address!: string;
  @Column({ type: 'text', nullable: true }) user_agent!: string | null;
  @Column({ type: 'varchar', length: 50, nullable: true }) device_type!:
    | string
    | null;
  @Column({ type: 'varchar', length: 2, nullable: true }) location_country!:
    | string
    | null;
  @Column({ type: 'varchar', length: 100, nullable: true }) location_city!:
    | string
    | null;
  @Column({ type: 'varchar', length: 255, nullable: true }) attempted_email!:
    | string
    | null;
  @Column({ type: 'jsonb', default: {} }) metadata!: Record<string, unknown>;
  @CreateDateColumn({ type: 'timestamptz' }) created_at!: Date;
}
