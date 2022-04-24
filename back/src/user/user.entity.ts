import { Column, Entity, PrimaryGeneratedColumn } from "typeorm";

@Entity('users')
export default class User {
	@PrimaryGeneratedColumn()
	id: number;

	@Column()
	name: string;

	@Column()
	age: number;
}
