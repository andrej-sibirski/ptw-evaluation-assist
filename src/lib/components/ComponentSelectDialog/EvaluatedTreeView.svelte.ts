import { AssemblyComponentTreeViewModel } from '$lib/models/assembly-component.model';
import { AssemblyGroupTreeViewModel } from '$lib/models/assembly-group.model';
import { ProductTreeViewModel } from '$lib/models/product.model';
import { WearCriterionTreeViewModel } from '$lib/models/wear-criterion.model';
import {WearThresholdTreeViewModel
} from '$lib/models/wear-threshold.model';

export class EvaluatedProductTreeViewModel extends ProductTreeViewModel {
	public override assemblyGroups: EvaluatedAssemblyGroupTreeViewModel[] = [];

	public canFinishEvaluation: boolean = $state(false);

	constructor(treeView: ProductTreeViewModel) {
		super(treeView);
		this.assemblyGroups = treeView.assemblyGroups.map((assemblyGroup) => {
			return new EvaluatedAssemblyGroupTreeViewModel(assemblyGroup, this, this);
		});
	}

	public checkIfCanFinishEvaluation(): void {
		this.canFinishEvaluation = getEvaluatedComponents(this).every((component) =>
			component.hasBeenEvaluated()
		);
	}
}

export class EvaluatedAssemblyGroupTreeViewModel extends AssemblyGroupTreeViewModel {
	public evaluatedProduct: EvaluatedProductTreeViewModel;
	public evaluatedParent:
		| EvaluatedAssemblyGroupTreeViewModel
		| EvaluatedProductTreeViewModel
		| null = null;
	public override children: (
		| EvaluatedAssemblyGroupTreeViewModel
		| EvaluatedAssemblyComponentTreeViewModel
	)[] = [];
	public evaluate: boolean = $state(true);
	public expanded: boolean = $state(true);

	constructor(
		assemblyGroupTreeViewModel: AssemblyGroupTreeViewModel,
		evaluatedProduct: EvaluatedProductTreeViewModel,
		evaluatedParent:
			| EvaluatedAssemblyGroupTreeViewModel
			| EvaluatedProductTreeViewModel
			| null = null
	) {
		super(assemblyGroupTreeViewModel);
		this.evaluatedProduct = evaluatedProduct;
		this.evaluatedParent = evaluatedParent;
		this.children = assemblyGroupTreeViewModel.children.map((child) => {
			if (child.type === 'assembly-group') {
				return new EvaluatedAssemblyGroupTreeViewModel(
					child as AssemblyGroupTreeViewModel,
					evaluatedProduct,
					this
				);
			} else {
				return new EvaluatedAssemblyComponentTreeViewModel(
					child as AssemblyComponentTreeViewModel,
					evaluatedProduct,
					this
				);
			}
		});
	}

	public checkForEvaluate() {
		const allChildrenEvaluate = this.children.every((child) => {
			if (child.type === 'assembly-group') {
				return (child as EvaluatedAssemblyGroupTreeViewModel).evaluate;
			} else {
				return (child as EvaluatedAssemblyComponentTreeViewModel).evaluate;
			}
		});

		this.evaluate = allChildrenEvaluate;

	}

	public setEvaluate(evaluate: boolean): void {
		this.evaluate = evaluate;
		this.children.forEach((child) => {
			if (child.type === 'assembly-group') {
				(child as EvaluatedAssemblyGroupTreeViewModel).setEvaluate(evaluate);
			} else {
				(child as EvaluatedAssemblyComponentTreeViewModel).evaluate = evaluate;
			}
		});

		if (this.parent instanceof EvaluatedAssemblyGroupTreeViewModel) {
			this.parent.checkForEvaluate();
		}
	}

	public expand(): void {
		this.expanded = true;
		if (this.evaluatedParent instanceof EvaluatedAssemblyGroupTreeViewModel) {
			this.evaluatedParent.expand();
		}
	}
}

export class EvaluatedAssemblyComponentTreeViewModel extends AssemblyComponentTreeViewModel {
	public override wearCriteria: EvaluatedWearCriterionTreeViewModel[] = [];
	public evaluatedProduct: EvaluatedProductTreeViewModel;
	public evaluatedParent: EvaluatedAssemblyGroupTreeViewModel;
	public evaluate: boolean = $state(true);
	public finishedEvaluation: boolean = $state(false);
	public evaluatedFixStrategy: string | null = $state(null);
	public skippedEvaluation: boolean = $state(false);

	constructor(
		assemblyComponentTreeViewModel: AssemblyComponentTreeViewModel,
		evaluatedProduct: EvaluatedProductTreeViewModel,
		evaluatedParent: EvaluatedAssemblyGroupTreeViewModel
	) {
		super(assemblyComponentTreeViewModel);
		this.evaluatedProduct = evaluatedProduct;
		this.evaluatedParent = evaluatedParent;
		this.wearCriteria = assemblyComponentTreeViewModel.wearCriteria.map((wearCriterion) => {
			return new EvaluatedWearCriterionTreeViewModel(wearCriterion, this);
		});
	}

	public setEvaluate(evaluate: boolean): void {
		this.evaluate = evaluate;
		this.evaluatedParent.checkForEvaluate();
	}

	public canBeEvaluated(): boolean {
		return this.wearCriteria.some((wearCriterion) => wearCriterion.canBeEvaluated());
	}

	public hasBeenEvaluated(): boolean {
		return this.finishedEvaluation || this.skippedEvaluation;
	}

	public getEvaluatedMeasures(): string {
		if (!this.evaluatedFixStrategy) {
			return '';
		}

		const matchedSelectedThreshold = this.wearCriteria.filter((wearCriterion) => {
			return wearCriterion.selectedThreshold?.fixStrategy === this.evaluatedFixStrategy;
		});

		
		const mySet = new Set(
			matchedSelectedThreshold
			.map((wearCriterion) => {
				return wearCriterion.selectedThreshold?.measures;
			})
            .filter((m) => m != undefined)
			.filter((m) => m.trim().length > 0)
		); 

		return [...mySet].join(', '); 

		/*
		return matchedSelectedThreshold
			.map((wearCriterion) => {
				return wearCriterion.selectedThreshold?.measures;
			})
            .filter((m) => m != undefined)
			.filter((m) => m.trim().length > 0)
			.join(', ');
		*/

	}
}

export class EvaluatedWearCriterionTreeViewModel extends WearCriterionTreeViewModel {
	public override wearThresholds: EvaluatedWearThresholdTreeViewModel[] = [];
	public evaluatedComponent: EvaluatedAssemblyComponentTreeViewModel;

	public selectedThreshold: EvaluatedWearThresholdTreeViewModel | null = $state(null);

	constructor(
		wearCriterion: WearCriterionTreeViewModel,
		evaluatedComponent: EvaluatedAssemblyComponentTreeViewModel
	) {
		super(wearCriterion);
		this.evaluatedComponent = evaluatedComponent;
		this.wearThresholds = wearCriterion.wearThresholds.map((wearThreshold) => {
			return new EvaluatedWearThresholdTreeViewModel(wearThreshold, this);
		});
	}

	public canBeEvaluated(): boolean {
		const hasEvaluatedThreshold = this.wearThresholds.some((threshold) =>
			threshold.canBeEvaluated()
		);
		return hasEvaluatedThreshold && this.label.length > 0;
	}
}

export class EvaluatedWearThresholdTreeViewModel extends WearThresholdTreeViewModel {
	public evaluatedCriterion: EvaluatedWearCriterionTreeViewModel;
	constructor(
		wearThreshold: WearThresholdTreeViewModel,
		criterion: EvaluatedWearCriterionTreeViewModel
	) {
		super(wearThreshold);
		this.evaluatedCriterion = criterion;
	}

	public canBeEvaluated(): boolean {
		return this.label.length > 0 && !!this.fixStrategy;
	}
}

export function getEvaluatedComponents(
	productTreeView: EvaluatedProductTreeViewModel
): EvaluatedAssemblyComponentTreeViewModel[] {
	const evaluatedComponents: EvaluatedAssemblyComponentTreeViewModel[] = [];
	productTreeView.assemblyGroups.forEach((assemblyGroup) => {
		getEvaluatedComponentsFromAssemblyGroup(assemblyGroup, evaluatedComponents);
	});
	return evaluatedComponents;
}

function getEvaluatedComponentsFromAssemblyGroup(
	assemblyGroup: EvaluatedAssemblyGroupTreeViewModel,
	evaluatedComponents: EvaluatedAssemblyComponentTreeViewModel[]
): void {
	assemblyGroup.children.forEach((child) => {
		if (child.type === 'assembly-group') {
			if ((child as EvaluatedAssemblyGroupTreeViewModel).evaluate) {
				getEvaluatedComponentsFromAssemblyGroup(
					child as EvaluatedAssemblyGroupTreeViewModel,
					evaluatedComponents
				);
			}
		} else {
			const assemblyComponentTreeViewElement = child as EvaluatedAssemblyComponentTreeViewModel;
			if (assemblyComponentTreeViewElement.evaluate) {
				evaluatedComponents.push(assemblyComponentTreeViewElement);
			}
		}
	});
}
