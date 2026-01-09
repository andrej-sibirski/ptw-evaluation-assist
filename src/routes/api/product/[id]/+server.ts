import { ProductViewModel } from '$lib/models/product.model';
import { Repository } from '$lib/server/repository';
import type { ProductTreeViewElements } from '$lib/util/ProductTreeViewUtil';
import { Console } from 'console';

export async function DELETE({ params }: { params: { id: string } }) {
	console.log('DeleteProduct', params);
	const repository = Repository.Instance;
	const result = repository.deleteProduct(params.id);
	return new Response(JSON.stringify(result));
}

export async function GET({ params, url }: { params: { id: string }; url: URL }) {
	console.log('GetProduct', params);
	const repository = Repository.Instance;
	const result = repository.getProduct(params.id);

	if (!result) {
		return new Response(null, { status: 404 });
	}

	const asTreeView = url.searchParams.get('asTreeView') === 'true';

	if (asTreeView) {
		const treeViewElements = getAllTreeViewElements(repository, result);
		return new Response(JSON.stringify(treeViewElements));
	} else {
		return new Response(JSON.stringify(result));
	}
}

export async function PUT({ params, request, url }: { params: { id: string }; request: Request, url: URL }) {
    
    console.log("Put")
    console.log(params)

    const repository = Repository.Instance;

    
    const asTreeView = url.searchParams.get('asTreeView') === 'true';

    if (asTreeView) {

        // To not have to deal with the complexity of updating the product and its children, we just delete the product and add it again
        const existingProduct = repository.getProduct(params.id);

        if (existingProduct) {
            repository.deleteProduct(params.id);
        }
        
        const productElements = (await request.json()) as ProductTreeViewElements;



        // If we are updating an existing product, we do not want to update the creation date
        if (!existingProduct) {
            productElements.product.createdAt = Date.now();
        }

        const newProduct = repository.addProduct(productElements.product);

        const resultElements: ProductTreeViewElements = {
            product: newProduct,
            groups: [],
            components: [],
            wearCriteria: [],
            wearThresholds: [],
            strategies: []
        };

        for (const group of productElements.groups) {
            resultElements.groups.push(repository.addAssemblyGroup(group));
        }

        for (const component of productElements.components) {
            resultElements.components.push(repository.addAssemblyComponent(component));
        }

        for (const criterion of productElements.wearCriteria) {      
            let a = criterion.notesOnTestMethod
            resultElements.wearCriteria.push(repository.addWearCriterion(criterion));
        }

        for (const threshold of productElements.wearThresholds) {
            resultElements.wearThresholds.push(repository.addWearThreshold(threshold));
        }

        for (const strategy of productElements.strategies) {
            resultElements.strategies.push(repository.addThresholdStrategy(strategy));
        }

        return new Response(JSON.stringify(resultElements));
    }  else {
        const product = (await request.json()) as ProductViewModel;
        const result = repository.addProduct(product);
        return new Response(JSON.stringify(result));
    }
}


function getAllTreeViewElements(
	repository: Repository,
	product: ProductViewModel
): ProductTreeViewElements {
	const groups = repository.getAssemblyGroups(product.id!);
	const components = repository.getAssemblyComponents(product.id!);
	const wearCriteria = repository.getWearCriteria(product.id!);
	const wearThresholds = repository.getWearThresholds(product.id!);
    const strategies = repository.getThresholdStrategies(product.id!);

	return {
        product,
		groups,
		components,
		wearCriteria,
		wearThresholds,
        strategies
	};
}
