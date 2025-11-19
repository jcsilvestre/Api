import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity({ name: 'user_roles', schema: 'auth' })
export class UserRole {
  @PrimaryGeneratedColumn() id!: number;
  @Column({ type: 'uuid' }) user_id!: string;
  @Column({ type: 'int' }) role_id!: number;
  @CreateDateColumn({ type: 'timestamptz' }) assigned_at!: Date;
  @Column({ type: 'uuid', nullable: true }) assigned_by!: string | null;
  @Column({ type: 'timestamptz', nullable: true }) expires_at!: Date | null;
}
