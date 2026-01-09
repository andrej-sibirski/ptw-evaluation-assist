<script lang="ts">
	import { HeaderService } from '../HeaderService.svelte';
	import { Icon } from '@smui/common';
	import Button from '@smui/button';
	import { goto } from '$app/navigation';
	import ProductTable from '$lib/components/ProductTable/ProductTable.svelte';
	import type { ProductViewModel } from '$lib/models/product.model';
	import { ProductImporter } from './ProductImporter';
	import { getElementsFromProductTreeView } from '$lib/util/ProductTreeViewUtil';
	import Snackbar, { Label, Actions as SnackbarActions } from '@smui/snackbar';
	import IconButton from '@smui/icon-button';

	HeaderService.Instance.setTitle('Konfiguration');
	let props: { data: { products: ProductViewModel[] } } = $props();
	let products = $state(props.data.products);

	let fileInput = $state<HTMLInputElement | null>(null);

	// Snackbar references
	let snackbarSuccess: Snackbar | null = $state(null);
	let snackbarError: Snackbar | null = $state(null);

	/**
	 * Zeigt eine Snackbar mit einer Nachricht an.
	 */
	function showSnackbar(snackbar: Snackbar | null, message: string) {
		if (!snackbar) return;
		snackbar.close(); // Schließe bestehende Snackbar
		setTimeout(() => {
			const element = snackbar.getElement(); // DOM-Element abrufen
			const label = element.querySelector('.snackbar-label') as HTMLElement;
			if (label) {
				label.innerText = message; // Nachricht in der Snackbar anzeigen
			}
			snackbar.open(); // Snackbar öffnen
		}, 10);
	}

	function editProduct(product: ProductViewModel) {
		goto(`/configuration/${product.id}`);
	}

	function deleteProduct(product: ProductViewModel) {
		fetch(`api/product/${product.id}`, {
			method: 'DELETE'
		});

		products = products.filter((p) => p.id !== product.id);
	}

	/**
	 * Datei ausgewählt
	 */
	function fileSelected() {
		const file = fileInput?.files?.[0];

		// Prüfen, ob die Datei eine .xlsm-Datei ist
		if (!file || !file.name.endsWith('.xlsm')) {
			showSnackbar(snackbarError, 'Ungültiger Dateityp. Nur .xlsm-Dateien sind erlaubt.');
			return;
		}

		const reader = new FileReader();

		reader.onload = function(e) {
			if (!e.target || !e.target.result) {
				showSnackbar(snackbarError, 'Fehler beim Lesen der Datei.');
				return;
			}

			try {
				const data = new Uint8Array(e.target.result as ArrayBuffer);
				const importedProduct = ProductImporter.getProductTreeViewFromXlsx(data);

				const elements = getElementsFromProductTreeView(importedProduct);
				

				// API-Aufruf zur Speicherung des Produkts
				fetch('/api/product/' + importedProduct.id + '?asTreeView=true', {
					method: 'PUT',
					headers: {
						'Content-Type': 'application/json'
					},
					body: JSON.stringify(elements)
				});

				// Füge das neue Produkt hinzu
				products = [
					...products,
					{
						id: importedProduct.id,
						name: importedProduct.name,
						createdAt: importedProduct.createdAt
					}
				];

				// Erfolg anzeigen
				showSnackbar(snackbarSuccess, 'Produkt erfolgreich importiert!');
			} catch (error: any) {
				console.error('Fehler beim Importieren der Datei:', error);
				showSnackbar(
					snackbarError,
					error.message || 'Fehler beim Importieren der Datei. Bitte überprüfen Sie die Struktur.'
				);
			}
		};

		reader.readAsArrayBuffer(file);
	}
</script>

<svelte:head>
	<title>Konfiguration</title>
	<meta name="description" content="PTW evaluation assist" />
</svelte:head>

<section class="page">
	<div class="back-button">
		<Button onclick={() => goto('/')}>
			<Icon class="material-icons">arrow_back</Icon>
			<span>Zurück</span>
		</Button>
	</div>

	<div class="product-table">
		<ProductTable
			{products}
			onProductClicked={(product) => editProduct(product)}
			showDelete
			onProductDelete={(product) => deleteProduct(product)} />
	</div>

	<div class="product-action-buttons">
		<Button
			id="add-product-button"
			variant="raised"
			color="primary"
			onclick={() => goto('/configuration/add')}>
			<Icon class="material-icons">add</Icon>
			<span>Produkt hinzufügen</span>
		</Button>
		<Button
			id="import-product-button"
			variant="raised"
			color="secondary"
			onclick={() => fileInput?.click()}>
			<Icon class="material-icons">file_upload</Icon>
			<span>Produkt importieren</span>
		</Button>
		<Button
			id="categories-button"
			variant="raised"
			color="secondary"
			onclick={() => goto('/configuration/categories')}>
			<Icon class="material-icons">list</Icon>
			<span>Kategorien editieren</span>
		</Button>

		<!-- Datei-Input mit Einschränkung auf .xlsm -->
		<input
			style="display: none"
			onchange={fileSelected}
			type="file"
			bind:this={fileInput}
			accept=".xlsm"
		/>
	</div>
</section>

<!-- Snackbar für Erfolg -->
<Snackbar bind:this={snackbarSuccess} class="snackbar-success">
	<Label class="snackbar-label">Erfolg</Label>
	<SnackbarActions>
		<IconButton class="material-icons" title="Dismiss">close</IconButton>
	</SnackbarActions>
</Snackbar>

<!-- Snackbar für Fehler -->
<Snackbar bind:this={snackbarError} class="snackbar-error">
	<Label class="snackbar-label">Fehler</Label>
	<SnackbarActions>
		<IconButton class="material-icons" title="Dismiss">close</IconButton>
	</SnackbarActions>
</Snackbar>

<style>
    .page {
        position: relative;
        width: 100%;
        height: 100%;
        display: flex;
        flex-direction: column;
        align-items: center;
    }

    .back-button {
        position: absolute;
        top: 20px;
        left: 20px;
        z-index: 100;
    }

    .product-table {
        max-height: 100%;
        height: 100%;
        overflow: auto;
        width: 100%;
        max-width: min(100%, 800px);
    }

    .product-action-buttons {
        position: absolute;
        top: 20px;
        right: 20px;
        display: flex;
        flex-direction: column;
        gap: 12px;
    }
</style>
