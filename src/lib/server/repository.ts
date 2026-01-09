import { ProductDatabaseModel, ProductViewModel } from '$lib/models/product.model';
import bcrypt from 'bcrypt';

import { DatabaseClient } from '$lib/server/database-client';
import dotenv from 'dotenv';
import type { AssemblyGroupViewModel } from '$lib/models/assembly-group.model';
import type { WearCriterionViewModel } from '$lib/models/wear-criterion.model';
import type { WearThresholdViewModel } from '$lib/models/wear-threshold.model';
import type { AssemblyComponentViewModel } from '$lib/models/assembly-component.model';
import type { ThresholdStrategyViewModel } from '$lib/models/threshold-strategy.model';
import type { MachineElementCategoryViewModel } from '$lib/models/machine-element-category.model';
import type { MachineElementViewModel } from '$lib/models/machine-element.model';
import type { MachineElementCriteriaViewModel } from '$lib/models/machine-element-criteria.model';

dotenv.config(); // Lädt die Umgebungsvariablen aus der .env-Datei
// Stellen Sie sicher, dass DEV_ADMIN_PASSWORD in der .env-Datei gesetzt ist

export class Repository {
	public static Instance: Repository;

	constructor(private databaseClient: DatabaseClient, afterInitActions: ((repository: Repository) => void)[] = []) {
		console.log('Repository constructor', databaseClient);
		if (!this.databaseClient.databaseExists()) {
			this.init();
			afterInitActions.forEach((action) => action(this));
		}
	}

	public init() {
		console.log('Initializing database');
		const db = this.databaseClient.createDatabase();
		db.pragma('foreign_keys = ON');

		this._initTables();
		this._initAdminUser();
	}

	public getProducts(): ProductViewModel[] {
		const database = this.databaseClient.getDatabase();
		const products = database.prepare('SELECT * FROM products').all() as ProductDatabaseModel[];

		return products
			.map((product) => ProductViewModel.fromDatabaseModel(product))
			.filter((product) => product !== null) as ProductViewModel[];
	}

	public getProduct(id: string): ProductViewModel | null {
		console.log('getProduct', id);
		const database = this.databaseClient.getDatabase();
		const statement = database.prepare('SELECT * FROM products WHERE id = ?');
		const product = statement.get(id) as ProductDatabaseModel;
		return ProductViewModel.fromDatabaseModel(product);
	}

	public addProduct(product: ProductViewModel): ProductViewModel {
		const database = this.databaseClient.getDatabase();
		const databaseModel = ProductViewModel.toDatabaseModel(product);

		const statement = database.prepare(
			'INSERT INTO products (id, name, createdAt) VALUES (?, ?, ?)'
		);
		statement.run(databaseModel.id, databaseModel.name, databaseModel.createdAt);
		return product;
	}

	public updateProduct(product: ProductViewModel): ProductViewModel {
		const database = this.databaseClient.getDatabase();

		const statement = database.prepare('UPDATE products SET name = ?, createdAt = ? WHERE id = ?');
		const databaseModel = ProductViewModel.toDatabaseModel(product);

		statement.run(databaseModel.name, databaseModel.createdAt, databaseModel.id);
		return product;
	}

	public deleteProduct(id: string): boolean {
		const database = this.databaseClient.getDatabase();
		const statement = database.prepare('DELETE FROM products WHERE id = ?');
		statement.run(id);
		return true;
	}

	public getAssemblyGroups(productId: string): AssemblyGroupViewModel[] {
		const database = this.databaseClient.getDatabase();
		const statement = database.prepare('SELECT * FROM assembly_groups WHERE productId = ?');
		const assemblyGroups = statement.all(productId);
		return assemblyGroups as AssemblyGroupViewModel[];
	}

	public addAssemblyGroup(assemblyGroup: AssemblyGroupViewModel): AssemblyGroupViewModel {
		const database = this.databaseClient.getDatabase();
		const statement = database.prepare(
			'INSERT INTO assembly_groups (id, productId, parentId, name) VALUES (?, ?, ?, ?)'
		);
		statement.run(
			assemblyGroup.id,
			assemblyGroup.productId,
			assemblyGroup.parentId,
			assemblyGroup.name
		);
		return assemblyGroup;
	}

	public updateAssemblyGroup(assemblyGroup: AssemblyGroupViewModel): AssemblyGroupViewModel {
		const database = this.databaseClient.getDatabase();
		const statement = database.prepare(
			'UPDATE assembly_groups SET productId = ?, parentId = ?, name = ? WHERE id = ?'
		);
		statement.run(
			assemblyGroup.productId,
			assemblyGroup.parentId,
			assemblyGroup.name,
			assemblyGroup.id
		);
		return assemblyGroup;
	}

	public deleteAssemblyGroup(id: string): boolean {
		const database = this.databaseClient.getDatabase();
		const statement = database.prepare('DELETE FROM assembly_groups WHERE id = ?');
		statement.run(id);
		return true;
	}

	public getAssemblyComponents(productId: string): AssemblyComponentViewModel[] {
		const database = this.databaseClient.getDatabase();
		const statement = database.prepare('SELECT * FROM assembly_components WHERE productId = ?');
		const assemblyComponents = statement.all(productId);
		return assemblyComponents as AssemblyComponentViewModel[];
	}

	public addAssemblyComponent(
		assemblyComponent: AssemblyComponentViewModel
	): AssemblyComponentViewModel {
		const database = this.databaseClient.getDatabase();
		const statement = database.prepare(
			'INSERT INTO assembly_components (id, productId, assemblyGroupId, name, machineElementCategory, machineElement) VALUES (?, ?, ?, ?, ?, ?)'
		);
		statement.run(
			assemblyComponent.id,
			assemblyComponent.productId,
			assemblyComponent.assemblyGroupId,
			assemblyComponent.name,
			assemblyComponent.machineElementCategory,
			assemblyComponent.machineElement
		);
		return assemblyComponent;
	}

	public updateAssemblyComponent(
		assemblyComponent: AssemblyComponentViewModel
	): AssemblyComponentViewModel {
		const database = this.databaseClient.getDatabase();
		const statement = database.prepare(
			'UPDATE assembly_components SET productId = ?, assemblyGroupId = ?, name = ?, machineElementCategory = ?, machineElement = ? WHERE id = ?'
		);
		statement.run(
			assemblyComponent.productId,
			assemblyComponent.assemblyGroupId,
			assemblyComponent.name,
			assemblyComponent.machineElementCategory,
			assemblyComponent.machineElement,
			assemblyComponent.id
		);
		return assemblyComponent;
	}

	public deleteAssemblyComponent(id: string): boolean {
		const database = this.databaseClient.getDatabase();
		const statement = database.prepare('DELETE FROM assembly_components WHERE id = ?');
		statement.run(id);
		return true;
	}

	public getWearCriteria(productId: string): WearCriterionViewModel[] {
		const database = this.databaseClient.getDatabase();
		const statement = database.prepare('SELECT * FROM wear_criteria WHERE productId = ?');
		const wearCriteria = statement.all(productId);
		return wearCriteria as WearCriterionViewModel[];
	}

	public addWearCriterion(wearCriterion: WearCriterionViewModel): WearCriterionViewModel {
		const database = this.databaseClient.getDatabase();
		const statement = database.prepare(
			'INSERT INTO wear_criteria (id, productId, componentId, label, notesOnTestMethod) VALUES (?, ?, ?, ?, ?)'
		);
		statement.run(
			wearCriterion.id,
			wearCriterion.productId,
			wearCriterion.componentId,
			wearCriterion.label,
			wearCriterion.notesOnTestMethod
		);
		return wearCriterion;
	}

	public updateWearCriterion(wearCriterion: WearCriterionViewModel): WearCriterionViewModel {
		const database = this.databaseClient.getDatabase();
		const statement = database.prepare(
			'UPDATE wear_criteria SET productId = ?, componentId = ?, question = ? WHERE id = ?'
		);
		statement.run(
			wearCriterion.productId,
			wearCriterion.componentId,
			wearCriterion.label,
			wearCriterion.id
		);
		return wearCriterion;
	}

	public deleteWearCriterion(id: string): boolean {
		const database = this.databaseClient.getDatabase();
		const statement = database.prepare('DELETE FROM wear_criteria WHERE id = ?');
		statement.run(id);
		return true;
	}

	public getWearThresholds(productId: string): WearThresholdViewModel[] {
		const database = this.databaseClient.getDatabase();
		const statement = database.prepare('SELECT * FROM wear_thresholds WHERE productId = ?');
		const wearThresholds = statement.all(productId);
		return wearThresholds as WearThresholdViewModel[];
	}

	public addWearThreshold(wearThreshold: WearThresholdViewModel): WearThresholdViewModel {
		const database = this.databaseClient.getDatabase();
		const statement = database.prepare(
			'INSERT INTO wear_thresholds (id, productId, criterionId, label, type, fixStrategy, measures, image) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
		);
		statement.run(
			wearThreshold.id,
			wearThreshold.productId,
			wearThreshold.criterionId,
			wearThreshold.label,
			wearThreshold.type,
			wearThreshold.fixStrategy,
			wearThreshold.measures,
			wearThreshold.image
		);
		return wearThreshold;
	}

	public updateWearThreshold(wearThreshold: WearThresholdViewModel): WearThresholdViewModel {
		const database = this.databaseClient.getDatabase();
		const statement = database.prepare(
			'UPDATE wear_thresholds SET productId = ?, criterionId = ?, label = ?, type = ?, fixStrategy = ?, measures = ?, image = ? WHERE id = ?'
		);
		statement.run(
			wearThreshold.productId,
			wearThreshold.criterionId,
			wearThreshold.label,
			wearThreshold.type,
			wearThreshold.fixStrategy,
			wearThreshold.measures,
			wearThreshold.image,
			wearThreshold.id
		);
		return wearThreshold;
	}

	public deleteWearThreshold(id: string): boolean {
		const database = this.databaseClient.getDatabase();
		const statement = database.prepare('DELETE FROM wear_thresholds WHERE id = ?');
		statement.run(id);
		return true;
	}

	public getThresholdStrategies(productId: string): ThresholdStrategyViewModel[] {
		const database = this.databaseClient.getDatabase();
		const statement = database.prepare('SELECT * FROM threshold_strategies WHERE productId = ?');
		const thresholdStrategies = statement.all(productId);
		return thresholdStrategies as ThresholdStrategyViewModel[];
	}

	public addThresholdStrategy(
		thresholdStrategy: ThresholdStrategyViewModel
	): ThresholdStrategyViewModel {
		const database = this.databaseClient.getDatabase();
		const statement = database.prepare(
			'INSERT INTO threshold_strategies (id, productId, name, priority) VALUES (?, ?, ?, ?)'
		);

		statement.run(
			thresholdStrategy.id,
			thresholdStrategy.productId,
			thresholdStrategy.name,
			thresholdStrategy.priority
		);

		return thresholdStrategy;
	}

	public deleteThresholdStrategy(id: string): boolean {
		const database = this.databaseClient.getDatabase();
		const statement = database.prepare('DELETE FROM threshold_strategies WHERE id = ?');
		statement.run(id);
		return true;
	}

	public getMachineElementCategories(): MachineElementCategoryViewModel[] {
		const database = this.databaseClient.getDatabase();
		const machineElementCategories = database.prepare('SELECT * FROM machine_element_categories').all();
		return machineElementCategories as MachineElementCategoryViewModel[];
	}

	public addMachineElementCategory(machineElementCategory: MachineElementCategoryViewModel): MachineElementCategoryViewModel {
		const database = this.databaseClient.getDatabase();
		const statement = database.prepare(
			'INSERT INTO machine_element_categories (id, name) VALUES (?, ?)'
		);
		statement.run(machineElementCategory.id, machineElementCategory.name);
		return machineElementCategory;
	}

	public deleteMachineElementCategories(): boolean {
		const database = this.databaseClient.getDatabase();
		const statement = database.prepare('DELETE FROM machine_element_categories');
		statement.run();
		return true;
	}

	public getMachineElements(): MachineElementViewModel[] {
		const database = this.databaseClient.getDatabase();
		const machineElements = database.prepare('SELECT * FROM machine_elements').all();
		return machineElements as MachineElementViewModel[];
	}

	public addMachineElement(machineElement: MachineElementViewModel): MachineElementViewModel {
		const database = this.databaseClient.getDatabase();
		const statement = database.prepare(
			'INSERT INTO machine_elements (id, name, machineElementCategoryId) VALUES (?, ?, ?)'
		);
		statement.run(machineElement.id, machineElement.name, machineElement.machineElementCategoryId);
		return machineElement;
	}

	public deleteMachineElements(): boolean {
		const database = this.databaseClient.getDatabase();
		const statement = database.prepare('DELETE FROM machine_elements');
		statement.run();
		return true;
	}

	public getMachineElementCriteria(): MachineElementCriteriaViewModel[] {
		const database = this.databaseClient.getDatabase();
		const machineElementCriteria = database.prepare('SELECT * FROM machine_element_criteria').all();
		return machineElementCriteria as MachineElementCriteriaViewModel[];
	}

	public addMachineElementCriteria(machineElementCriteria: MachineElementCriteriaViewModel): MachineElementCriteriaViewModel {
		const database = this.databaseClient.getDatabase();
		const statement = database.prepare(
			'INSERT INTO machine_element_criteria (id, name, machineElementId) VALUES (?, ?, ?)'
		);
		statement.run(machineElementCriteria.id, machineElementCriteria.name, machineElementCriteria.machineElementId);
		return machineElementCriteria;
	}

	public deleteMachineElementCriteria(): boolean {
		const database = this.databaseClient.getDatabase();
		const statement = database.prepare('DELETE FROM machine_element_criteria');
		statement.run();
		return true;
	}

	public async userExists(username: string, password: string): Promise<boolean> {
		const database = this.databaseClient.getDatabase();
		const statement = database.prepare('SELECT * FROM users WHERE username = ?');
		const user = statement.get(username) as { username: string; password: string } | undefined;

		if (user) {
			const passwordMatches = await bcrypt.compare(password, user.password);
			console.log('Passwort korrekt:', passwordMatches);
			return passwordMatches;
		}

		return true; //@todo user initializer hinzufügen
	}

	private _initTables() {
		const db = this.databaseClient.getDatabase();
		// Products table
		db.prepare(
			`CREATE TABLE products (
						id TEXT PRIMARY KEY, 
						name TEXT NOT NULL,
						createdAt INTEGER NOT NULL
				)`
		).run();
		// Assembly group table
		db.prepare(
			`CREATE TABLE assembly_groups (
						id TEXT PRIMARY KEY, 
						productId TEXT NOT NULL, 
						parentId TEXT, 
						name TEXT NOT NULL, 
						FOREIGN KEY(productId) REFERENCES products(id) ON DELETE CASCADE, 
						FOREIGN KEY(parentId) REFERENCES assembly_groups(id)
				)`
		).run();
		// Assembly component table
		db.prepare(
			`CREATE TABLE assembly_components (
						id TEXT PRIMARY KEY, 
						productId TEXT NOT NULL, 
						assemblyGroupId TEXT NOT NULL, 
						name TEXT NOT NULL, 
						machineElementCategory TEXT, 
						machineElement TEXT, 
						FOREIGN KEY(productId) REFERENCES products(id) ON DELETE CASCADE, 
						FOREIGN KEY(assemblyGroupId) REFERENCES assembly_groups(id)
				)`
		).run();
		// Wear criterion table
		db.prepare(
			`CREATE TABLE wear_criteria (
						id TEXT PRIMARY KEY, 
						productId TEXT NOT NULL, 
						componentId TEXT NOT NULL, 
						label TEXT NOT NULL, 
						notesOnTestMethod TEXT NULL,
						FOREIGN KEY(productId) REFERENCES products(id) ON DELETE CASCADE, 
						FOREIGN KEY(componentId) REFERENCES assembly_components(id)
					)`
		).run();
		// Wear threshold table
		db.prepare(
			`CREATE TABLE wear_thresholds (
						id TEXT PRIMARY KEY, 
						productId TEXT NOT NULL,
						criterionId TEXT NOT NULL, 
						label TEXT, 
						type TEXT NOT NULL, 
						fixStrategy TEXT,
						measures TEXT,
						image TEXT,
						FOREIGN KEY(productId) REFERENCES products(id) ON DELETE CASCADE, 
						FOREIGN KEY(criterionId) REFERENCES wear_criteria(id)
					)`
		).run();

		// Threshold strategy table
		db.prepare(
			`CREATE TABLE threshold_strategies (
				id TEXT PRIMARY KEY,
				productId TEXT NOT NULL,
				name TEXT NOT NULL,
				priority INTEGER NOT NULL,
				FOREIGN KEY(productId) REFERENCES products(id) ON DELETE CASCADE
			)`
		).run();

		// MachineElementCategory tablek
		db.prepare(
			`CREATE TABLE machine_element_categories (
				id TEXT PRIMARY KEY,
				name TEXT NOT NULL
				)`
		).run();
		// MachineElement table
		db.prepare(
			`CREATE TABLE machine_elements (
				id TEXT PRIMARY KEY,
				name TEXT NOT NULL,
				machineElementCategoryId TEXT NOT NULL,
				FOREIGN KEY(machineElementCategoryId) REFERENCES machine_element_categories(id)
				)`
		).run();

		// MachineElementCriteria table
		db.prepare(
			`CREATE TABLE machine_element_criteria (
				id TEXT PRIMARY KEY,
				name TEXT NOT NULL,
				machineElementId TEXT NOT NULL,
				FOREIGN KEY(machineElementId) REFERENCES machine_elements(id)
				)`
		).run();

		// Users table
		db.prepare(
			`CREATE TABLE users (
						id INTEGER PRIMARY KEY AUTOINCREMENT, 
						username TEXT NOT NULL, 
						password TEXT NOT NULL
				)`
		).run();
	}

	private async _initAdminUser() {
		const db = this.databaseClient.getDatabase();

		// Prüfe, ob der Benutzer 'admin' bereits existiert
		const statementCheck = db.prepare('SELECT * FROM users WHERE username = ?');
		const adminUser = statementCheck.get('admin');

		if (adminUser) {
			console.log('Admin-Benutzer existiert bereits.');
			return;
		}

		const password = process.env.DEV_ADMIN_PASSWORD;

		console.log('Initialisiere Admin-Benutzer: ' + password);

		if (!password) {
			throw new Error('DEV_ADMIN_PASSWORD ist nicht gesetzt! Setze es in der .env-Datei.');
		}

		// Passwort mit bcrypt hashen
		const saltRounds = 10;
		const passwordHash = await bcrypt.hash(password, saltRounds);
		console.log('Initiales Admin-Passwort wurde erfolgreich erstellt.');

		// User,Passwort Kombination in Datenbank ablegen
		const statementInsert = db.prepare('INSERT INTO users (username, password) VALUES (?, ?)');
		statementInsert.run('admin', passwordHash);
		console.log('Admin-Benutzer wurde erfolgreich erstellt.');
	}

	async getAdmin() {
		const db = this.databaseClient.getDatabase();

		// Hole den Benutzer 'admin'
		const statement = db.prepare('SELECT * FROM users WHERE username = ?');
		return statement.get('admin');
	}

	async updateAdminPassword(newPassword: string) {
		const db = this.databaseClient.getDatabase();

		// Update-Statement für das Passwort
		const statement = db.prepare('UPDATE users SET password = ? WHERE username = ?');
		const result = statement.run(newPassword, 'admin');

		// Rückmeldung über den Erfolg
		if (result.changes === 1) {
			console.log('Passwort erfolgreich aktualisiert.');
		} else {
			console.log('Fehler beim Aktualisieren des Passworts.');
		}
		return result.changes === 1;
	}
}
