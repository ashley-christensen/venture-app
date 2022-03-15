'use strict';

class Venture {
  date = new Date();
  id = (Date.now() + '').slice(-10);

  constructor(coords, rating, duration) {

    this.coords = coords; // [lat, lng]
    this.rating = rating;
    this.duration = duration;
  }

  _setDescription() {
    // prettier-ignore
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

    this.description = `${this.type[0].toUpperCase()}${this.type.slice(1)} on ${
      months[this.date.getMonth()]
    } ${this.date.getDate()}`;
  }
}

class Social extends Venture {
  type = 'social';
  constructor(coords, rating, duration, friends) {
    super(coords, rating, duration);
    this.friends = friends;
    this._setDescription();
  }
}
class Alone extends Venture {
  type = 'alone';
  constructor(coords, rating, duration) {
    super(coords, rating, duration);
    this._setDescription();
  }
}

// //////////////////////////
// Application ARCHITECTURE

const form = document.querySelector('.form');
const containerVentures = document.querySelector('.ventures');
const inputHidden = document.querySelectorAll('.form__input--hidden');
const inputType = document.querySelector('.form__input--type');
const inputRating = document.querySelector('.form__input--rating');
const inputDuration = document.querySelector('.form__input--duration');
const inputFriends = document.querySelector('.form__input--friends');

class App {
  #map;
  #mapZoomLevel = 13;
  #mapEvent;
  #ventures = [];

  constructor() {
    // Get user's position
    this._getPosition();

    // Get data from local storage
    this._getLocalStorage();

    // attach event handlers
    form.addEventListener('submit', this._newVenture.bind(this));
    inputType.addEventListener('change', this._toggleFriendsField);
    containerVentures.addEventListener('click', this._moveToPopup.bind(this));
  }

  _getPosition() {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        this._loadMap.bind(this),
        function () {
          alert('Could not get your position');
        }
      );
    }
  }

  _loadMap(position) {
    const { latitude } = position.coords;
    const { longitude } = position.coords;

    // Displaying Map using Leaflet library
    const coords = [latitude, longitude];
    this.#map = L.map('map').setView(coords, this.#mapZoomLevel);
    // Select tile layer, add it to map
    L.tileLayer('https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png', {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(this.#map);

    // handling clicks on map

    this.#map.on('click', this._showForm.bind(this));

    this.#ventures.forEach(vent => {
      this._renderWorkoutMarker(vent);
    });
  }

  _showForm(mapE) {
    this.#mapEvent = mapE;
    form.classList.remove('hidden');
    inputDuration.focus();
  }

  _hideForm() {
    // Empty the inputs
    inputDuration.value = inputFriends.value = '';

    form.style.display = 'none';
    form.classList.add('hidden');
    setTimeout(() => (form.style.display = 'grid'), 1000);
  }

  _toggleFriendsField() {
    inputFriends.closest('.form__row').classList.toggle('form__row--hidden');
  }

  _newVenture(e) {
    const validInputs = (...inputs) =>
      inputs.every(inp => Number.isFinite(inp));
    const allPositive = (...inputs) => inputs.every(inp => inp > 0);

    e.preventDefault();

    // Get data from form
    const type = inputType.value;
    const rating = +inputRating.value;
    const duration = +inputDuration.value;
    const { lat, lng } = this.#mapEvent.latlng;
    let venture;

    // If venture social, create social object
    if (type === 'social') {
      const friends = +inputFriends.value;

      if (
        !validInputs(rating, duration, friends) ||
        !allPositive(rating, duration, friends)
      )
        return alert('Inputs have to be positive numbers!');

      venture = new Social([lat, lng], rating, duration, friends);
    }
    // If venture alone, create alone object
    if (type === 'alone') {
      if (!validInputs(rating, duration) || !allPositive(rating, duration))
        return alert('Inputs have to be positive numbers!');
      venture = new Alone([lat, lng], rating, duration);
    }
    // Add new object to venture array
    this.#ventures.push(venture);

    // Render venture on map as marker
    this._renderWorkoutMarker(venture);

    // Render venture on list
    this._renderVenture(venture);

    // Hide form + Clear input fields
    this._hideForm();

    // Set local storage to all ventures
    this._setLocalStorage();
  }

  _renderWorkoutMarker(venture) {
    L.marker(venture.coords)
      .addTo(this.#map)
      .bindPopup(
        L.popup({
          maxWidth: 250,
          minWidth: 100,
          autoClose: false,
          closeOnClick: false,
          className: `${venture.type}-popup`,
        })
      )
      .setPopupContent(
        `${venture.type === 'social' ? '👬' : '💁🏼 '} ${venture.description}`
      )
      .openPopup();
  }

  _renderVenture(venture) {
    let html = `
    <li class="venture venture--${venture.type}" data-id="${venture.id}">
      <h2 class="venture__title"> ${venture.description}</h2>
        <div class="venture__details">
          <span class="venture__icon">${
            venture.type === 'social' ? '👬   Group' : '💁🏼   Solo'
          }</span>
      </div>
        <div class="venture__details">
          <span class="venture__icon">⭐️</span>
          <span class="venture__value">${venture.rating}</span>
          <span class="venture__unit">stars</span>
        </div>
        <div class="venture__details">
          <span class="venture__icon">⏱</span>
          <span class="venture__value">${venture.duration}</span>
          <span class="venture__unit">min</span>
    </div>`;

    if (venture.type === 'social')
      html += `
          <div class="venture__details">
            <span></span>
            <span class="venture__value">${venture.friends}</span>
            <span class="venture__unit">friends</span>
          </div>
        </li>`;

    form.insertAdjacentHTML('afterend', html);
  }

  _moveToPopup(e) {
    const ventureEl = e.target.closest('.venture');

    if (!ventureEl) return;

    const venture = this.#ventures.find(
      vent => vent.id === ventureEl.dataset.id
    );

    this.#map.setView(venture.coords, this.#mapZoomLevel, {
      animate: true,
      pan: {
        duration: 1,
      },
    });
  }

  _setLocalStorage() {
    localStorage.setItem('ventures', JSON.stringify(this.#ventures));
  }

  _getLocalStorage() {
    const data = JSON.parse(localStorage.getItem('ventures'));

    if (!data) return;

    this.#ventures = data;
    this.#ventures.forEach(vent => {
      this._renderVenture(vent);
    });
  }

  reset() {
    localStorage.removeItem('ventures');
    location.reload();
  }
}

const app = new App();
