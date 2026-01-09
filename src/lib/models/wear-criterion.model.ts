import type { AssemblyComponentTreeViewModel } from './assembly-component.model';
import { DatabaseModel } from './database.model';
import type { WearThresholdTreeViewModel } from './wear-threshold.model';
import { v4 as uuidv4 } from 'uuid';

export class WearCriterionDatabaseModel extends DatabaseModel {
    componentId: string | undefined;
    productId: string | undefined;
    label: string = '';
}

export class WearCriterionViewModel {
    id: string = uuidv4();
    componentId: string | undefined;
    productId: string | undefined;
    label: string = '';
    notesOnTestMethod : string = '';
    constructor(options: Partial<WearCriterionViewModel> = {}) {
        Object.assign(this, options);
    }

}

export class WearCriterionTreeViewModel {
    id: string = uuidv4();
    type: string = 'wear-criterion';
    label: string = '';
    notesOnTestMethod: string = ''; 
    component: AssemblyComponentTreeViewModel | undefined;
    wearThresholds: WearThresholdTreeViewModel[] = [];

    constructor(options: Partial<WearCriterionTreeViewModel> = {}) {
        Object.assign(this, options);
    }
}

