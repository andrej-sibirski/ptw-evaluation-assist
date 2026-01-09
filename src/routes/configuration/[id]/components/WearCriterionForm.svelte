<script lang="ts">
	import Textfield  from '@smui/textfield'
	import Select, { Option } from '@smui/select';
	import Autocomplete from '@smui-extra/autocomplete';
	import IconButton from '@smui/icon-button';
	import {
		AssemblyComponentTreeViewModel,
		CategoryElement,
		Strategies
	} from '$lib/models/assembly-component.model';
	import type { WearCriterionTreeViewModel } from '$lib/models/wear-criterion.model';
	import WearThresholdForm from './WearThresholdForm.svelte';
	import type { ThresholdStrategyTreeViewModel } from '$lib/models/threshold-strategy.model';
	import type { MachineElementTreeViewModel } from '$lib/util/CategoriesTreeViewUtil.svelte';

	let {
		wearCriterion = $bindable(),
		machineElement,
		strategies,
		ondelete
	}: {
		wearCriterion: WearCriterionTreeViewModel;
		machineElement: MachineElementTreeViewModel | null | undefined;
		strategies: ThresholdStrategyTreeViewModel[];
		ondelete: () => void;
	} = $props();

	console.log('wearCriterion', wearCriterion, machineElement);


	let availableCriteria = $derived.by(() => machineElement?.criteria?.map((c) => c.name) ?? []);



</script>

<div class="wear-criterion-form">
	<div class="criterion">
		<Autocomplete combobox bind:value={wearCriterion.label} label="Kriterium" options={availableCriteria} />
		
		<IconButton onclick={ondelete}>
			<i class="material-icons">delete</i>
		</IconButton>
	</div>
	<Textfield bind:value={wearCriterion.notesOnTestMethod} label="Hinweise zum Prüfverfahren"></Textfield>
	<br>
	
	<div class="thresholds">
		{#each wearCriterion.wearThresholds as threshold, i}
			<WearThresholdForm bind:wearThreshold={wearCriterion.wearThresholds[i]} strategies={strategies} />
		{/each}

	</div>


	
</div>

<style>
.criterion {
	display: flex;
	align-items: center;
	gap: 8px;
	margin-bottom: 24px;
}

.wear-criterion-form {
	display: flex;
	flex-direction: column;
}

.thresholds {
	display: flex;
	flex-direction: column;
	gap: 12px;
}
</style>
