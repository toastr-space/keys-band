/**
 * Utility functions for working with Svelte 5 runes
 */
// Svelte 5 runes are globally available - no need to import

/**
 * Creates a counter with reactive state using Svelte 5 runes
 * @param initial Initial counter value
 * @returns Counter object with reactive state
 */
export function createCounter(initial = 0) {
	let count = $state(initial);

	return {
		get count() {
			return count;
		},
		increment: () => count++,
		decrement: () => count--,
		reset: () => (count = initial)
	};
}

/**
 * Creates a toggle with reactive state using Svelte 5 runes
 * @param initial Initial toggle state
 * @returns Toggle object with reactive state
 */
export function createToggle(initial = false) {
	let value = $state(initial);

	return {
		get value() {
			return value;
		},
		set value(newValue: boolean) {
			value = newValue;
		},
		toggle: () => (value = !value),
		turnOn: () => (value = true),
		turnOff: () => (value = false)
	};
}

/**
 * Creates a form state manager with reactive state using Svelte 5 runes
 * @param initialValues Initial form values
 * @returns Form state manager with reactive state
 */
export function createFormState<T extends Record<string, any>>(initialValues: T) {
	let values = $state<T>({ ...initialValues });
	let errors = $state<Partial<Record<keyof T, string>>>({});
	let touched = $state<Partial<Record<keyof T, boolean>>>({});
	let isSubmitting = $state(false);
	let isValid = $derived(Object.keys(errors).length === 0);

	function setValue<K extends keyof T>(field: K, value: T[K]) {
		values[field] = value;
		touched[field] = true;
		validateField(field);
	}

	function validateField<K extends keyof T>(field: K) {
		// Override this in your implementation
	}

	function resetForm() {
		values = { ...initialValues };
		errors = {};
		touched = {};
		isSubmitting = false;
	}

	return {
		get values() {
			return values;
		},
		get errors() {
			return errors;
		},
		get touched() {
			return touched;
		},
		get isSubmitting() {
			return isSubmitting;
		},
		get isValid() {
			return isValid;
		},
		setValue,
		validateField,
		resetForm,
		setSubmitting: (value: boolean) => (isSubmitting = value),
		setError: <K extends keyof T>(field: K, error: string) => (errors[field] = error),
		clearError: <K extends keyof T>(field: K) => delete errors[field]
	};
}

/**
 * Creates a list manager with reactive state using Svelte 5 runes
 * @param initialItems Initial list items
 * @returns List manager with reactive state
 */
export function createList<T>(initialItems: T[] = []) {
	let items = $state<T[]>([...initialItems]);
	let selectedIndex = $state<number | null>(null);
	let selectedItem = $derived(selectedIndex !== null ? items[selectedIndex] : null);

	function addItem(item: T) {
		items = [...items, item];
	}

	function removeItem(index: number) {
		items = items.filter((_, i) => i !== index);
		if (selectedIndex === index) {
			selectedIndex = null;
		} else if (selectedIndex !== null && selectedIndex > index) {
			selectedIndex--;
		}
	}

	function updateItem(index: number, item: T) {
		items = items.map((oldItem, i) => (i === index ? item : oldItem));
	}

	function selectItem(index: number | null) {
		selectedIndex = index;
	}

	return {
		get items() {
			return items;
		},
		get selectedIndex() {
			return selectedIndex;
		},
		get selectedItem() {
			return selectedItem;
		},
		addItem,
		removeItem,
		updateItem,
		selectItem,
		clearSelection: () => (selectedIndex = null),
		clearItems: () => {
			items = [];
			selectedIndex = null;
		}
	};
}
