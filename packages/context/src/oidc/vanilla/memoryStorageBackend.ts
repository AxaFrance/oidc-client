export class MemoryStorageBackend {
    public items: any;
    private saveItemsAsync: Function;

    constructor(saveItemsAsync, items = {}) {
        this.items = items;
        this.saveItemsAsync = saveItemsAsync;
        this.saveItemsAsync.bind(this);
        this.getItem.bind(this);
        this.removeItem.bind(this);
        this.clear.bind(this);
        this.setItem.bind(this);
    }

    getItem(name) {
        return Promise.resolve(this.items[name]);
    }

    removeItem(name) {
        delete this.items[name];
        return this.saveItemsAsync(this.items);
    }

    clear() {
        this.items = {};
        return this.saveItemsAsync(this.items);
    }

    setItem(name, value) {
        this.items[name] = value;
        return this.saveItemsAsync(this.items);
    }
}