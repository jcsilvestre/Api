import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity({ name: 'sessions', schema: 'auth' })
export class Session {
  @PrimaryGeneratedColumn('uuid') id!: string;
  @Column({ type: 'uuid' }) user_id!: string;
  @Column({ type: 'varchar', length: 500, unique: true }) refresh_token!: string;
  @Column({ type: 'varchar', length: 255, unique: true }) refresh_token_hash!: string;
  @Column({ type: 'varchar', length: 255, nullable: true }) device_id!: string | null;
  @Column({ type: 'varchar', length: 50, nullable: true }) device_type!: string | null;
  @Column({ type: 'varchar', length: 255, nullable: true }) device_name!: string | null;
  @Column({ type: 'inet' }) ip_address!: string;
  @Column({ type: 'text', nullable: true }) user_agent!: string | null;
  @Column({ type: 'varchar', length: 2, nullable: true }) location_country!: string | null;
  @Column({ type: 'varchar', length: 100, nullable: true }) location_city!: string | null;
  @Column({ type: 'timestamptz' }) expires_at!: Date;
  @Column({ type: 'boolean', default: true }) is_active!: boolean;
  @Column({ type: 'timestamptz', nullable: true }) last_activity_at!: Date | null;
  @CreateDateColumn({ type: 'timestamptz' }) created_at!: Date;
  @Column({ type: 'timestamptz', nullable: true }) revoked_at!: Date | null;
}
