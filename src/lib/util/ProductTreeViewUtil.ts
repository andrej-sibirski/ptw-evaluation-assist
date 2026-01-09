import {
	AssemblyComponentTreeViewModel,
	AssemblyComponentViewModel
} from '$lib/models/assembly-component.model';
import {
	AssemblyGroupTreeViewModel,
	AssemblyGroupViewModel
} from '$lib/models/assembly-group.model';
import { ProductTreeViewModel, ProductViewModel } from '$lib/models/product.model';
import {
	ThresholdStrategyTreeViewModel,
	ThresholdStrategyViewModel
} from '$lib/models/threshold-strategy.model';
import {
	WearCriterionTreeViewModel,
	WearCriterionViewModel
} from '$lib/models/wear-criterion.model';
import {
	WearThresholdTreeViewModel,
	WearThresholdViewModel
} from '$lib/models/wear-threshold.model';

export type ProductTreeViewElements = {
	product: ProductViewModel;
	groups: AssemblyGroupViewModel[];
	components: AssemblyComponentViewModel[];
	wearCriteria: WearCriterionViewModel[];
	wearThresholds: WearThresholdViewModel[];
	strategies: ThresholdStrategyViewModel[];
};

export function createProductTreeView(elements: ProductTreeViewElements): ProductTreeViewModel {
	const treeView = new ProductTreeViewModel();
	treeView.id = elements.product.id;
	treeView.name = elements.product.name;
	treeView.createdAt = elements.product.createdAt;

	treeView.fixStrategies = elements.strategies.map(
		(strategy) =>
			new ThresholdStrategyTreeViewModel({
				id: strategy.id,
				name: strategy.name,
				priority: strategy.priority,
				product: treeView
			})
	);

	const assemblyGroups = elements.groups.filter((group) => !group.parentId);

	for (const assemblyGroup of assemblyGroups) {
		const assemblyGroupTreeView = buildAssemblyGroupTreeView(
			elements,
			treeView,
			assemblyGroup
		);
		treeView.assemblyGroups.push(assemblyGroupTreeView);
	}

	return treeView;
}

export function getComponents(
	node: ProductTreeViewModel | AssemblyGroupTreeViewModel
): AssemblyComponentTreeViewModel[] {
	const components: AssemblyComponentTreeViewModel[] = [];
	if (node instanceof ProductTreeViewModel) {
		for (const assemblyGroup of node.assemblyGroups) {
			components.push(...getComponents(assemblyGroup));
		}
		return components;
	} else {
		for (const child of node.children) {
			if (child.type === 'assembly-component') {
				components.push(child as AssemblyComponentTreeViewModel);
			} else {
				components.push(...getComponents(child as AssemblyGroupTreeViewModel));
			}
		}

		return components;
	}
}

export function getElementsFromProductTreeView(
	treeView: ProductTreeViewModel
): ProductTreeViewElements {
	const elements: ProductTreeViewElements = {
		product: new ProductViewModel({ id: treeView.id, name: treeView.name, createdAt: treeView.createdAt }),
		groups: [],
		components: [],
		wearCriteria: [],
		wearThresholds: [],
		strategies: getStrategiesFromProductTreeView(treeView)
	};

	for (const assemblyGroup of treeView.assemblyGroups) {
		getElementsFromAssemblyGroupTreeView(elements, assemblyGroup);
	}

	return elements;
}

function buildAssemblyGroupTreeView(
	elements: ProductTreeViewElements,
	parent: ProductTreeViewModel | AssemblyGroupTreeViewModel,
	assemblyGroup: AssemblyGroupViewModel
): AssemblyGroupTreeViewModel {
	const treeView = new AssemblyGroupTreeViewModel();
	treeView.id = assemblyGroup.id;
	treeView.name = assemblyGroup.name;
	treeView.parent = parent;

	const assemblyGroups = elements.groups.filter((group) => group.parentId === assemblyGroup.id);
	const assemblyComponents = elements.components.filter(
		(component) => component.assemblyGroupId === assemblyGroup.id
	);

	for (const assemblyGroup of assemblyGroups) {
		const assemblyGroupTreeView = buildAssemblyGroupTreeView(elements, treeView, assemblyGroup);
		treeView.children.push(assemblyGroupTreeView);
	}

	for (const assemblyComponent of assemblyComponents) {
		const assemblyComponentTreeView = buildAssemblyComponentTreeView(
			elements,
			treeView,
			assemblyComponent
		);
		treeView.children.push(assemblyComponentTreeView);
	}

	return treeView;
}

function buildAssemblyComponentTreeView(
	elements: ProductTreeViewElements,
	parent: AssemblyGroupTreeViewModel,
	assemblyComponent: AssemblyComponentViewModel
): AssemblyComponentTreeViewModel {
	const treeView = new AssemblyComponentTreeViewModel();
	treeView.id = assemblyComponent.id;
	treeView.name = assemblyComponent.name;
	treeView.machineElementCategory = assemblyComponent.machineElementCategory;
	treeView.machineElement = assemblyComponent.machineElement;
	treeView.parent = parent;

	const wearCriteria = elements.wearCriteria.filter(
		(wearCriterion) => wearCriterion.componentId === assemblyComponent.id
	);

	for (const wearCriterion of wearCriteria) {
		const wearCriterionTreeView = buildWearCriterionTreeView(elements, treeView, wearCriterion);
		treeView.wearCriteria.push(wearCriterionTreeView);
	}

	return treeView;
}

function buildWearCriterionTreeView(
	elements: ProductTreeViewElements,
	parent: AssemblyComponentTreeViewModel,
	wearCriterion: WearCriterionViewModel
): WearCriterionTreeViewModel {
	const treeView = new WearCriterionTreeViewModel();
	treeView.id = wearCriterion.id;
	treeView.label = wearCriterion.label;
	treeView.notesOnTestMethod = wearCriterion.notesOnTestMethod;
	treeView.component = parent;

	const wearThresholds = elements.wearThresholds.filter(
		(threshold) => threshold.criterionId === wearCriterion.id
	);

	for (const wearThreshold of wearThresholds) {
		const wearThresholdTreeView = buildWearThresholdTreeView(elements, treeView, wearThreshold);
		treeView.wearThresholds.push(wearThresholdTreeView);
	}

	return treeView;
}

function buildWearThresholdTreeView(
	elements: ProductTreeViewElements,
	parent: WearCriterionTreeViewModel,
	wearThreshold: WearThresholdViewModel
): WearThresholdTreeViewModel {
	const treeView = new WearThresholdTreeViewModel();
	treeView.id = wearThreshold.id;
	treeView.label = wearThreshold.label;
	treeView.type = wearThreshold.type;
	treeView.fixStrategy = wearThreshold.fixStrategy;
	treeView.measures = wearThreshold.measures;
	treeView.criterion = parent;
	treeView.image = wearThreshold.image;
	return treeView;
}

function getElementsFromAssemblyGroupTreeView(
	elements: ProductTreeViewElements,
	treeView: AssemblyGroupTreeViewModel
) {
	const group = new AssemblyGroupViewModel({
		id: treeView.id,
		name: treeView.name,
		productId: elements.product.id,
		parentId:
			treeView.parent instanceof AssemblyGroupTreeViewModel ? treeView.parent?.id : undefined
	});

	elements.groups.push(group);

	for (const child of treeView.children) {
		if (child.type === 'assembly-group') {
			getElementsFromAssemblyGroupTreeView(elements, child as AssemblyGroupTreeViewModel);
		} else {
			getElementsFromAssemblyComponentTreeView(elements, child as AssemblyComponentTreeViewModel);
		}
	}
}

function getElementsFromAssemblyComponentTreeView(
	elements: ProductTreeViewElements,
	treeView: AssemblyComponentTreeViewModel
) {
	const component = new AssemblyComponentViewModel({
		id: treeView.id,
		name: treeView.name,
		assemblyGroupId: treeView.parent!.id,
		productId: elements.product.id,
		machineElementCategory: treeView.machineElementCategory,
		machineElement: treeView.machineElement
	});

	elements.components.push(component);

	for (const child of treeView.wearCriteria) {
		getElementsFromWearCriterionTreeView(elements, child);
	}
}

function getElementsFromWearCriterionTreeView(
	elements: ProductTreeViewElements,
	treeView: WearCriterionTreeViewModel
) {
	const wearCriterion = new WearCriterionViewModel({
		id: treeView.id,
		productId: elements.product.id,
		componentId: treeView.component!.id,
		label: treeView.label,
		notesOnTestMethod : treeView.notesOnTestMethod
	});

	console.log('Store WearCriterion', wearCriterion);

	elements.wearCriteria.push(wearCriterion);

	for (const child of treeView.wearThresholds) {
		getElementsFromWearThresholdTreeView(elements, child);
	}
}

function getElementsFromWearThresholdTreeView(
	elements: ProductTreeViewElements,
	treeView: WearThresholdTreeViewModel
) {
	const wearThreshold = new WearThresholdViewModel({
		id: treeView.id,
		productId: elements.product.id,
		criterionId: treeView.criterion!.id,
		label: treeView.label,
		type: treeView.type,
		fixStrategy: treeView.fixStrategy,
		measures: treeView.measures,
		image: treeView.image
	});

	elements.wearThresholds.push(wearThreshold);
}

function getStrategiesFromProductTreeView(
	productTreeView: ProductTreeViewModel
): ThresholdStrategyViewModel[] {
	return productTreeView.fixStrategies.map(
		(strategy) =>
			new ThresholdStrategyViewModel({
				id: strategy.id,
				name: strategy.name,
				priority: strategy.priority,
				productId: productTreeView.id
			})
	);
}
