// A stand-in for HA's hui-generic-entity-row, which only exists inside the HA
// frontend. It shows the buttons and keeps the properties the row sets on it.
customElements.define('hui-generic-entity-row', class extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({mode: 'open'}).innerHTML = '<slot></slot>';
  }
});
