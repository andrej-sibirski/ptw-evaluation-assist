import { AssemblyComponentTreeViewModel } from '$lib/models/assembly-component.model';
import { AssemblyGroupTreeViewModel } from '$lib/models/assembly-group.model';
import { ProductTreeViewModel } from '$lib/models/product.model';
import * as XLSX from 'xlsx';
import { v4 as uuidv4 } from 'uuid';
import { getComponents } from '$lib/util/ProductTreeViewUtil';
import { WearCriterionTreeViewModel } from '$lib/models/wear-criterion.model';
import { WearThresholdTreeViewModel, WearThresholdType } from '$lib/models/wear-threshold.model';
import { ThresholdStrategyTreeViewModel } from '$lib/models/threshold-strategy.model';

export class ProductImporter {
	public static getProductTreeViewFromXlsx(workbookData: Uint8Array): ProductTreeViewModel {
		const workbook = XLSX.read(workbookData, { type: 'array' });

		const structureWorksheet = workbook.Sheets['Aufbau'];

		if (!structureWorksheet) {
			throw new Error('Tabelle: "Aufbau" nicht gefunden');
		}

		const thresholdWorksheet = workbook.Sheets['Grenzwerte'];

		if (!thresholdWorksheet) {
			throw new Error('Tabelle: "Grenzwerte" nicht gefunden');
		}

		const categoryWorksheet = workbook.Sheets['Kategorien'];

		if (!categoryWorksheet) {
			throw new Error('Tabelle: "Kategorien" nicht gefunden');
		}

		const structureData = XLSX.utils.sheet_to_json(structureWorksheet, { header: 1 }) as string[][];
		const thresholdData = XLSX.utils.sheet_to_json(thresholdWorksheet, { header: 1 }) as string[][];
		const categoryData = XLSX.utils.sheet_to_json(categoryWorksheet, { header: 1 }) as string[][];

		console.log(structureData);
		console.log(thresholdData);
		console.log(categoryData);

		const productTreeViewModel = new ProductTreeViewModel();

		productTreeViewModel.name = structureData[7][1];

		if (!productTreeViewModel.name) {
			throw new Error('Produktname nicht gefunden');
		}

		this.addAssemblyGroupsToProduct(structureData, productTreeViewModel);

		const components = getComponents(productTreeViewModel);

		for (const component of components) {
			this.addWearCriteriaToComponent(thresholdData, component);
		}

		const strategies = this.getStrategies(categoryData, productTreeViewModel);

		
		productTreeViewModel.fixStrategies = strategies;

		return productTreeViewModel;
	}

	private static addAssemblyGroupsToProduct(
		structureData: string[][],
		productTreeView: ProductTreeViewModel
	): AssemblyGroupTreeViewModel[] {
		const assemblyGroups: AssemblyGroupTreeViewModel[] = [];

		const maxGroupDepth = this.getAssemblyGroupDepth(structureData[8]);

		let currentPath: AssemblyGroupTreeViewModel[] = [];
		
		for (let i = 9; i < structureData.length; i++) {
			const {groupNames, level: groupLevel} = this.getAssemblyGroupNames(structureData[i], maxGroupDepth);
			console.log('GROUP NAMES', groupNames);

			if (groupNames.length == 0) {
				if (
					currentPath &&
					structureData[i][maxGroupDepth] &&
					structureData[i][maxGroupDepth].trim().length > 0
				) {
					const previousGroup = currentPath[currentPath.length - 1];
					this.addComponentToGroup(structureData, maxGroupDepth, i, previousGroup);
				} else {
					continue;
				}
			} else {
				if (groupLevel == 0) {
					currentPath = this.addGroupToParent(
						structureData,
						maxGroupDepth,
						i,
						groupNames,
						productTreeView,
						[]
					);
					assemblyGroups.push(currentPath[0]);
				} else if (groupLevel > 0 && currentPath) {
					currentPath = this.addGroupToParent(
						structureData,
						maxGroupDepth - groupLevel,
						i,
						groupNames,
						currentPath[groupLevel - 1],
						currentPath.slice(0, groupLevel)
					);
				} else {
					throw new Error('Group Level not found');
				}

				console.log('CURRENT PATH', currentPath);
				

				this.addComponentToGroup(structureData, maxGroupDepth, i, currentPath[currentPath.length - 1]);
				
			}
		}

		return assemblyGroups;
	}

	private static addGroupToParent(
		structureData: string[][],
		maxGroupDepth: number,
		currentRowIndex: number,
		groupNames: string[],
		parent: AssemblyGroupTreeViewModel | ProductTreeViewModel,
		path: AssemblyGroupTreeViewModel[]
	): AssemblyGroupTreeViewModel[] {
		const currentName = groupNames.splice(0, 1)[0];

		const group = new AssemblyGroupTreeViewModel({
			id: uuidv4(),
			parent: parent,
			name: currentName
		});

		path.push(group);

		if (parent instanceof ProductTreeViewModel) {
			parent.assemblyGroups.push(group);
		} else {
			parent.children.push(group);
		}

		if (groupNames.length > 0) {
			return this.addGroupToParent(
				structureData,
				maxGroupDepth,
				currentRowIndex,
				groupNames,
				group,
				path
			);
		} else {
			return path;
		}
	}

	private static addComponentToGroup(
		structureData: string[][],
		maxGroupDepth: number,
		currentRowIndex: number,
		group: AssemblyGroupTreeViewModel
	): void {
		const component = new AssemblyComponentTreeViewModel({
			id: uuidv4(),
			parent: group,
			name: structureData[currentRowIndex][maxGroupDepth],
			machineElementCategory: structureData[currentRowIndex][maxGroupDepth + 1],
			machineElement: structureData[currentRowIndex][maxGroupDepth + 2]
		});

		group.children.push(component);
	}

	private static addWearCriteriaToComponent(
		thresholdData: string[][],
		component: AssemblyComponentTreeViewModel
	): void {
		for (let i = 1; i < thresholdData.length; i++) {
			if (thresholdData[i][0] == component.name) {
				i += 2;
				while (
					i < thresholdData.length &&
					!thresholdData[i + 4]?.[0]?.includes('Verschleiß des Bauteils')
				) {
					const wearCriteria = this.getWearCriteria(thresholdData, component, i);
					if (!wearCriteria) {
						break;
					}
					component.wearCriteria.push(wearCriteria);
					i += 3;
				}

				break;
			}
		}
	}

	private static getWearCriteria(
		thresholdData: string[][],
		component: AssemblyComponentTreeViewModel,
		currentRowIndex: number
	): WearCriterionTreeViewModel | null {
		const label = thresholdData[currentRowIndex + 1][0];
		if (!label || label.trim().length == 0) {
			return null;
		}

		const wearCriteria = new WearCriterionTreeViewModel({
			id: uuidv4(),
			component: component,
			label: thresholdData[currentRowIndex + 1][0]
		});

		const opticalThreshold = new WearThresholdTreeViewModel({
			id: uuidv4(),
			criterion: wearCriteria,
			type: WearThresholdType.OpticalError,
			label: thresholdData[currentRowIndex][2],
			fixStrategy: thresholdData[currentRowIndex][3],
			measures: thresholdData[currentRowIndex][4]
		});

		const functionalThreshold = new WearThresholdTreeViewModel({
			id: uuidv4(),
			criterion: wearCriteria,
			type: WearThresholdType.FunctionalError,
			label: thresholdData[currentRowIndex + 1][2],
			fixStrategy: thresholdData[currentRowIndex + 1][3],
			measures: thresholdData[currentRowIndex + 1][4]
		});

		const safetyThreshold = new WearThresholdTreeViewModel({
			id: uuidv4(),
			criterion: wearCriteria,
			type: WearThresholdType.SafetyError,
			label: thresholdData[currentRowIndex + 2][2],
			fixStrategy: thresholdData[currentRowIndex + 2][3],
			measures: thresholdData[currentRowIndex + 2][4]
		});

		wearCriteria.wearThresholds.push(opticalThreshold);
		wearCriteria.wearThresholds.push(functionalThreshold);
		wearCriteria.wearThresholds.push(safetyThreshold);
		return wearCriteria;
	}

	private static getStrategies(
		categoryData: string[][],
		product: ProductTreeViewModel
	): ThresholdStrategyTreeViewModel[] {
		let inStrategyTable = false;

		const strategies: ThresholdStrategyTreeViewModel[] = [];

		for (let i = 0; i < categoryData.length; i++) {
			if (inStrategyTable && categoryData[i][0] && categoryData[i][0].length > 0) {
				const strategy = new ThresholdStrategyTreeViewModel({
					id: uuidv4(),
					product: product,
					priority: strategies.length,
					name: categoryData[i][0]
				});

				strategies.push(strategy);
			} else {
				if (categoryData[i][0] == 'Strategie') {
					inStrategyTable = true;
					continue;
				}
			}
		}

		return strategies;
	}

	private static getAssemblyGroupDepth(row: string[]): number {
		let depth = 0;

		for (let i = 0; i < row.length; i++) {
			if (row[i] != 'Komponente') {
				depth++;
			} else {
				break;
			}
		}

		return depth;
	}

	private static getAssemblyGroupNames(row: string[], maxDepth: number): {groupNames: string[], level: number} {
		const groupNames: string[] = [];

		let firstGroupFound = false;
		let level = 0;

		for (let i = 0; i < maxDepth; i++) {
			if (!firstGroupFound && (!row[i] || row[i].trim() == '')) {
				level++;
				continue;
			}

			if (row[i] && row[i].trim() != '' && row[i].trim() != 'X') {
				groupNames.push(row[i]);
				firstGroupFound = true;
			} else {
				break;
			}
		}

		return {groupNames, level};
	}
}
