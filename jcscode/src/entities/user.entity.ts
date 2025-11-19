import {
  Column,
  CreateDateColumn,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
  Entity,
} from 'typeorm';

@Entity({ name: 'users', schema: 'auth' })
export class User {
  @PrimaryGeneratedColumn('uuid') id!: string;
  @Index({ unique: true })
  @Column({ type: 'citext' })
  email!: string;
  @Column({ type: 'varchar', length: 20, nullable: true, unique: true })
  phone!: string | null;
  @Column({ type: 'varchar', length: 50, nullable: true, unique: true })
  username!: string | null;
  @Column({ type: 'varchar', length: 255, nullable: true }) full_name!:
    | string
    | null;
  @Column({ type: 'text', nullable: true }) avatar_url!: string | null;
  @Column({ type: 'date', nullable: true }) date_of_birth!: Date | null;
  @Column({ type: 'varchar', length: 255, nullable: true }) password_hash!:
    | string
    | null;
  @Column({ type: 'varchar', length: 20, default: 'pending_verification' })
  status!: string;
  @Column({ type: 'boolean', default: false }) is_email_verified!: boolean;
  @Column({ type: 'boolean', default: false }) is_phone_verified!: boolean;
  @Column({ type: 'timestamptz', nullable: true })
  email_verified_at!: Date | null;
  @Column({ type: 'timestamptz', nullable: true })
  phone_verified_at!: Date | null;
  @Column({ type: 'int', default: 0 }) failed_login_attempts!: number;
  @Column({ type: 'timestamptz', nullable: true }) locked_until!: Date | null;
  @Column({ type: 'timestamptz', nullable: true })
  last_password_change!: Date | null;
  @Column({ type: 'boolean', default: false }) mfa_enabled!: boolean;
  @Column({ type: 'varchar', length: 255, nullable: true }) mfa_secret!:
    | string
    | null;
  @Column({ type: 'text', array: true, nullable: true }) mfa_backup_codes!:
    | string[]
    | null;
  @Column({ type: 'varchar', length: 5, default: 'pt-BR' }) language!: string;
  @Column({ type: 'varchar', length: 50, default: 'America/Sao_Paulo' })
  timezone!: string;
  @Column({ type: 'jsonb', default: {} }) metadata!: Record<string, unknown>;
  @Column({ type: 'timestamptz', nullable: true }) last_login_at!: Date | null;
  @Column({ type: 'timestamptz', nullable: true }) last_seen_at!: Date | null;
  @CreateDateColumn({ type: 'timestamptz' }) created_at!: Date;
  @UpdateDateColumn({ type: 'timestamptz' }) updated_at!: Date;
  @Column({ type: 'timestamptz', nullable: true }) deleted_at!: Date | null;
}
