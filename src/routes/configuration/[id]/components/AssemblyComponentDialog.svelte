<script lang="ts">
	import Dialog, { Content, Title } from '@smui/dialog';
	import Button from '@smui/button';
	import Textfield from '@smui/textfield';
	import { Icon } from '@smui/common';
	import {
		AssemblyComponentTreeViewModel,
		PredefinedComponentCategory
	} from '$lib/models/assembly-component.model';
	import Select, { Option } from '@smui/select';
	import WearCriterionForm from './WearCriterionForm.svelte';
	import { WearCriterionTreeViewModel } from '$lib/models/wear-criterion.model';
	import { WearThresholdTreeViewModel, WearThresholdType } from '$lib/models/wear-threshold.model';
	import Autocomplete from '@smui-extra/autocomplete';
	import { ThresholdStrategyTreeViewModel } from '$lib/models/threshold-strategy.model';
	import type { CategoriesTreeView } from '$lib/util/CategoriesTreeViewUtil.svelte';

	import * as util from 'util' // has no default export
	
	let {
		open = $bindable(),
		strategies,
		categoriesTreeView,
		onSave,
		assemblyComponent = new AssemblyComponentTreeViewModel(),
	}: {
		open: boolean;
		strategies: ThresholdStrategyTreeViewModel[];
		categoriesTreeView: CategoriesTreeView;
		onSave: (group: AssemblyComponentTreeViewModel) => void;
		assemblyComponent?: AssemblyComponentTreeViewModel;
	} = $props();

	console.log('assemblyComponent', assemblyComponent);

	
	let wearCriteria = $state(assemblyComponent.wearCriteria);

	if (!assemblyComponent.wearCriteria || assemblyComponent.wearCriteria.length === 0) {
		console.log('add wear criterion');
		addWearCriterion();
	}

	

	console.log('AssemblyComponent', assemblyComponent);
	let name = $state(assemblyComponent.name); // Für gleichen Dialog bzw fürs editieren
	let machineElementCategory = $state(assemblyComponent.machineElementCategory);
	let machineElement = $state(assemblyComponent.machineElement);

	let invalidName = $state(false);

	let predefinedCategories = categoriesTreeView.map((category) => category.name);

	let selectedCategory = $derived.by(() => {
		return categoriesTreeView.find((category) => category.name === machineElementCategory);
	});

	let predefinedElements = $derived.by(() => {
		if (!selectedCategory) return [];
		return selectedCategory.elements.map((element) => element.name);
	});

	let selectedElement = $derived.by(() => {
		if (!selectedCategory) return null;
		return selectedCategory.elements.find((element) => element.name === machineElement);
	});

	function addWearCriterion() {
		
		const wearCriterion = new WearCriterionTreeViewModel();
		wearCriterion.component = assemblyComponent;
		wearCriterion.wearThresholds = [
			new WearThresholdTreeViewModel({
				type: WearThresholdType.OpticalError,
				criterion: wearCriterion
			}),
			new WearThresholdTreeViewModel({
				type: WearThresholdType.FunctionalError,
				criterion: wearCriterion
			}),
			new WearThresholdTreeViewModel({
				type: WearThresholdType.SafetyError,
				criterion: wearCriterion
			})
		]
		wearCriteria.push(wearCriterion);
	}

	function removeWearCriterion(index: number) {
		wearCriteria.splice(index, 1);
	}

	function saveNewComponent() {
		if (!name || name.trim() === '') {
			invalidName = true;
			return;
		}
		const component = new AssemblyComponentTreeViewModel({
			...assemblyComponent,
			name,
			machineElementCategory,
			machineElement,
			wearCriteria
		});
		
		onSave(component);
		open = false;
	}

	function cancel() {
		name = '';
		open = false;
	}
	
</script>

<Dialog bind:open class="custom-dialog">
	<Title><span data-testid="dialog-title">Neue Komponente</span></Title>
	<Content class="content">
		<Textfield
			required
			invalid={invalidName}
			style="width: 100%;"
			bind:value={name}
			onkeydown={(e: { key: string; }) => e.key === 'Enter' && saveNewComponent()}
			label="Name">
		</Textfield>


		<Autocomplete style="margin-top: 12px" combobox bind:value={machineElementCategory} options={predefinedCategories} label="Kategorie Maschinenelement"></Autocomplete>

		<Autocomplete style="margin-top: 12px" combobox bind:value={machineElement} options={predefinedElements} label="Maschinenelement"></Autocomplete>

		<br>
		<br>
		<br>
		<div class="wear-criterion-title">Verschleißkriterien</div>

		<div class="wear-criteria">
			{#each wearCriteria as verschleißkrit, index}
				<WearCriterionForm bind:wearCriterion={wearCriteria[index]} machineElement={selectedElement} strategies={strategies} ondelete={() => removeWearCriterion(index)} />
				<br>
				<hr class="dashed">
					
			{/each}
		</div>

		<Button id="wear-criterion-add-button" onclick={addWearCriterion}>
			<Icon class="material-icons">add</Icon>
			<span>Verschleißkriterium hinzufügen</span>
		</Button>
	</Content>

	<div class="actions">
		<Button class="cancel-button" onclick={() => cancel()}>Abbrechen</Button>
		<Button onclick={() => saveNewComponent()}>Speichern</Button>
	</div>
</Dialog>

<style>
	:global(.custom-dialog .mdc-dialog__surface) {
		max-width: none;
		height: 70vh;
		width: 80vw;
	}
	:global(.content .mdc-dialog__content) {
		max-width: none;
		width: 100%;
	}
	:global(.mdc-deprecated-list) {
		max-height: 200px;
		overflow-y: auto;
	}

	.wear-criterion-title {
		font-size: 1rem;
		margin-top: 24px;
		font-weight: 600;
		margin-bottom: 8px;
	}

	.wear-criteria {
		display: flex;
		flex-direction: column;
		gap: 18px;
	}


	.actions {
		display: flex;
		justify-content: flex-end;
		gap: 8px;
		margin: 8px 8px 8px 0;
	}

	.dashed {
  		border-top: 10px dashed #000000;
    }

	:global(#wear-criterion-add-button) {
		margin-top: 24px;
	}
</style>
