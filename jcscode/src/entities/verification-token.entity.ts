import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity({ name: 'verification_tokens', schema: 'auth' })
export class VerificationToken {
  @PrimaryGeneratedColumn('uuid') id!: string;
  @Column({ type: 'uuid' }) user_id!: string;
  @Column({ type: 'varchar', length: 255, unique: true }) token!: string;
  @Index()
  @Column({ type: 'varchar', length: 255, unique: true })
  token_hash!: string;
  @Column({ type: 'varchar', length: 50 }) token_type!: string;
  @Column({ type: 'timestamptz' }) expires_at!: Date;
  @Column({ type: 'boolean', default: false }) is_used!: boolean;
  @Column({ type: 'timestamptz', nullable: true }) used_at!: Date | null;
  @Column({ type: 'jsonb', default: {} }) metadata!: Record<string, unknown>;
  @Column({ type: 'inet', nullable: true }) ip_address!: string | null;
  @Column({ type: 'text', nullable: true }) user_agent!: string | null;
  @CreateDateColumn({ type: 'timestamptz' }) created_at!: Date;
}
