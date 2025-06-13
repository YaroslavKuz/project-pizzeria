/* global Handlebars, utils, dataSource */ // eslint-disable-line no-unused-vars

// const { init } = require("browser-sync");

{
  'use strict';

  const select = {
    templateOf: {
      menuProduct: '#template-menu-product',
      cartProduct: '#template-cart-product', // CODE ADDED
    },
    containerOf: {
      menu: '#product-list',
      cart: '#cart',
    },
    all: {
      menuProducts: '#product-list > .product',
      menuProductsActive: '#product-list > .product.active',
      formInputs: 'input, select',
    },
    menuProduct: {
      clickable: '.product__header',
      form: '.product__order',
      priceElem: '.product__total-price .price',
      imageWrapper: '.product__images',
      amountWidget: '.widget-amount',
      cartButton: '[href="#add-to-cart"]',
    },
    widgets: {
      amount: {
        input: 'input.amount', // CODE CHANGED
        linkDecrease: 'a[href="#less"]',
        linkIncrease: 'a[href="#more"]',
      },
    },
    // CODE ADDED START
    cart: {
      productList: '.cart__order-summary',
      toggleTrigger: '.cart__summary',
      totalNumber: `.cart__total-number`,
      totalPrice: '.cart__total-price strong, .cart__order-total .cart__order-price-sum strong',
      subtotalPrice: '.cart__order-subtotal .cart__order-price-sum strong',
      deliveryFee: '.cart__order-delivery .cart__order-price-sum strong',
      form: '.cart__order',
      formSubmit: '.cart__order [type="submit"]',
      phone: '[name="phone"]',
      address: '[name="address"]',
    },
    cartProduct: {
      amountWidget: '.widget-amount',
      price: '.cart__product-price',
      edit: '[href="#edit"]',
      remove: '[href="#remove"]',
    },
    // CODE ADDED END
  };

  const classNames = {
    menuProduct: {
      wrapperActive: 'active',
      imageVisible: 'active',
    },
    // CODE ADDED START
    cart: {
      wrapperActive: 'active',
    },
    // CODE ADDED END
  };

  const settings = {
    amountWidget: {
      defaultValue: 1,
      defaultMin: 1,
      defaultMax: 9,
    }, // CODE CHANGED
    // CODE ADDED START
    cart: {
      defaultDeliveryFee: 20,
    },
    // CODE ADDED END
    db: {
      url: '//localhost:3131',
      products: 'products',
      orders: 'orders',
    },
  };

  const templates = {
    menuProduct: Handlebars.compile(document.querySelector(select.templateOf.menuProduct).innerHTML),
    // CODE ADDED START
    cartProduct: Handlebars.compile(document.querySelector(select.templateOf.cartProduct).innerHTML),
    // CODE ADDED END
  };

  class Product {
    constructor(id, data) {
      const thisProduct = this;

      thisProduct.id = id;
      thisProduct.data = data;
      thisProduct.renderInMenu();
      thisProduct.getElements();
      thisProduct.initAccordion();
      thisProduct.initOrderForm();
      thisProduct.initAmountWidget();
      thisProduct.processOrder();
      console.log('new Product:', thisProduct);
    }
    initAmountWidget() {
      const thisProduct = this;

      thisProduct.amountWidget = new amountWidget(thisProduct.amountWidgetElem);
      thisProduct.amountWidgetElem.addEventListener('updated', function () {
        console.log('Amount widget updated!');

        // Викликаємо обробку замовлення при зміні кількості
        thisProduct.processOrder();
      })
    }

    renderInMenu() {
      const thisProduct = this;

      // ganarate Html based on template
      const generatedHTML = templates.menuProduct(thisProduct.data);


      // create element using units.createElementFromHtml
      thisProduct.element = utils.createDOMFromHTML(generatedHTML);

      // find menu container
      const menuContainer = document.querySelector(select.containerOf.menu);

      // add element to menu
      menuContainer.appendChild(thisProduct.element);
    }

    getElements() {
      const thisProduct = this;

      thisProduct.accordionTrigger = thisProduct.element.querySelector(select.menuProduct.clickable);
      thisProduct.form = thisProduct.element.querySelector(select.menuProduct.form);
      thisProduct.formInputs = thisProduct.form.querySelectorAll(select.all.formInputs);
      thisProduct.cartButton = thisProduct.element.querySelector(select.menuProduct.cartButton);
      thisProduct.priceElem = thisProduct.element.querySelector(select.menuProduct.priceElem);
      thisProduct.imageWrapper = thisProduct.element.querySelector(select.menuProduct.imageWrapper);
      thisProduct.amountWidgetElem = thisProduct.element.querySelector(select.menuProduct.amountWidget);
    }



    initAccordion() {
      const thisProduct = this;

      /* find the clickable trigger (the element that should react to clicking) */


      /* START: add event listener to clickable trigger on event click */
      thisProduct.accordionTrigger.addEventListener('click', function (event) {
        /* prevent default action for event */
        event.preventDefault();

        /* find active product (product that has active class) */
        const activeProduct = document.querySelector(select.all.menuProductsActive);

        /* if there is active product and it's not thisProduct.element, remove class active from it */
        if (activeProduct && activeProduct !== thisProduct.element) {
          activeProduct.classList.remove(classNames.menuProduct.wrapperActive);
        }

        /* toggle active class on thisProduct.element */
        thisProduct.element.classList.toggle(classNames.menuProduct.wrapperActive);
      });

    }

    initOrderForm() {
      const thisProduct = this;
      console.log('initOrderForm');

      thisProduct.form.addEventListener('submit', function (event) {
        event.preventDefault();
        thisProduct.processOrder();
      });

      for (let input of thisProduct.formInputs) {
        input.addEventListener('change', function () {
          thisProduct.processOrder();
        });
      }

      thisProduct.cartButton.addEventListener('click', function (event) {
        event.preventDefault();
        thisProduct.processOrder();
        thisProduct.addToCart();
      });

    }

    processOrder() {
      const thisProduct = this;
      // console.log('processOrder');

      // covert form to object structure e.g. { sauce: ['tomato'], toppings: ['olives', 'redPeppers']}
      const formData = utils.serializeFormToObject(thisProduct.form);
      // console.log('formData', formData);

      // set price to default price
      let price = thisProduct.data.price;

      // for every category (param)...
      for (let paramId in thisProduct.data.params) {
        // determine param value, e.g. paramId = 'toppings', param = { label: 'Toppings', type: 'checkboxes'... }
        const param = thisProduct.data.params[paramId];
        // console.log(paramId, param);

        // for every option in this category
        for (let optionId in param.options) {
          // determine option value, e.g. optionId = 'olives', option = { label: 'Olives', price: 2, default: true }
          const option = param.options[optionId];
          // console.log(optionId, option);

          // 1. Check if this option is selected in formData for this category paramId
          const optionSelected = formData[paramId] && formData[paramId].includes(optionId);
          // console.log('optSelected', optionSelected);

          // 2. If selected and not default — add price
          if (optionSelected && !option.default) {
            price += option.price; // додаємо ціну
          }

          // 3. If not selected and default — subtract price
          if (!optionSelected && option.default) {
            price -= option.price; // віднімаємо ціну
          }

          // 4. Show/hide images 
          const image = thisProduct.imageWrapper.querySelector('.' + paramId + '-' + optionId);
          if (image) {
            if (optionSelected) {
              image.classList.add(classNames.menuProduct.imageVisible);
            } else {
              image.classList.remove(classNames.menuProduct.imageVisible);
            }

          }
        }
      }
      // update calculated price in the HTML
      thisProduct.priceSingle = price;
      price *= thisProduct.amountWidget.value;
      thisProduct.priceElem.innerHTML = price;
    }

    addToCart() {
      const thisProduct = this;

      app.cart.add(thisProduct.prepareCartProduct());
    }
    prepareCartProduct() {
      const thisProduct = this;

      const productSummary = {
        id: thisProduct.id,
        name: thisProduct.data.name,
        amount: thisProduct.amountWidget.value,
        priceSingle: thisProduct.priceSingle, // price fir 1 itm
        price: thisProduct.priceSingle * thisProduct.amountWidget.value,
        params: thisProduct.prepareCartProductParams(),
      };
      return productSummary;
    }

    prepareCartProductParams() {
      const thisProduct = this;

      const formData = utils.serializeFormToObject(thisProduct.form);
      const params = {};

      // for very category (param)
      for (let paramId in thisProduct.data.params) {
        const param = thisProduct.data.params[paramId];

        // create category param in params const eg. params = { ingredients: { name: 'Ingredients', options: {}}}
        params[paramId] = {
          label: param.label,
          options: {}
        }

        // for every option in this category
        for (let optionId in param.options) {
          const option = param.options[optionId];
          const optionSelected = formData[paramId] && formData[paramId].includes(optionId);

          if (optionSelected) {
            // option is selected!
            params[paramId].options[optionId] = option.label;
          }
        }
      }

      return params;
    }
  }


  class amountWidget {
    constructor(element) {
      const thisWidget = this;

      // console.log('amountWidget:', thisWidget);
      // console.log('constructor arguments:', element);

      thisWidget.getElements(element);
      thisWidget.initActions();
    }

    getElements(element) {
      const thisWidget = this;

      thisWidget.element = element;
      thisWidget.input = thisWidget.element.querySelector(select.widgets.amount.input);
      thisWidget.linkDecrease = thisWidget.element.querySelector(select.widgets.amount.linkDecrease);
      thisWidget.linkIncrease = thisWidget.element.querySelector(select.widgets.amount.linkIncrease);
      const inputValue = parseInt(thisWidget.input.value);


      if (!isNaN(inputValue)) {
        thisWidget.setValue(inputValue);
      } else {
        thisWidget.setValue(settings.amountWidget.defaultValue);
      }
    }

    setValue(value) {
      const thisWidget = this;

      const newValue = parseInt(value);

      // * todo Add validation

      /* TODO: Add validation */
      if (thisWidget.value !== newValue && !isNaN(newValue) &&
        newValue >= settings.amountWidget.defaultMin &&
        newValue <= settings.amountWidget.defaultMax) {
        thisWidget.value = newValue;
      }


      thisWidget.input.value = thisWidget.value;
      thisWidget.announce();
    }

    initActions() {
      const thisWidget = this;

      // 1. Слухаємо зміну в input
      thisWidget.input.addEventListener('change', function () {
        thisWidget.setValue(thisWidget.input.value);
      });

      // 2. Мінус кнопка
      thisWidget.linkDecrease.addEventListener('click', function (event) {
        event.preventDefault();
        thisWidget.setValue(thisWidget.value - 1);
      });

      // 3. Плюс кнопка
      thisWidget.linkIncrease.addEventListener('click', function (event) {
        event.preventDefault();
        thisWidget.setValue(thisWidget.value + 1);
      });
    }
    announce() {
      const thisWidget = this;

      const event = new CustomEvent('updated', {
        bubbles: true
      });


      thisWidget.element.dispatchEvent(event);
    }
  }

  class Cart {
    constructor(element) {
      const thisCart = this;

      thisCart.products = [];
      thisCart.getElements(element);
      thisCart.initActions();

      console.log('new Cart', thisCart);
    }

    getElements(element) {
      const thisCart = this;

      thisCart.dom = {};

      thisCart.dom.wrapper = element;
      thisCart.dom.toggleTrigger = thisCart.dom.wrapper.querySelector(select.cart.toggleTrigger);
      thisCart.dom.productList = thisCart.dom.wrapper.querySelector(select.cart.productList);

      thisCart.dom.deliveryFee = thisCart.dom.wrapper.querySelector(select.cart.deliveryFee);
      thisCart.dom.subtotalPrice = thisCart.dom.wrapper.querySelector(select.cart.subtotalPrice);
      thisCart.dom.totalPrice = thisCart.dom.wrapper.querySelectorAll(select.cart.totalPrice);
      thisCart.dom.totalNumber = thisCart.dom.wrapper.querySelector(select.cart.totalNumber);
      thisCart.dom.form = thisCart.dom.wrapper.querySelector(select.cart.form);
      thisCart.dom.phone = thisCart.dom.wrapper.querySelector(select.cart.phone);
      thisCart.dom.address = thisCart.dom.wrapper.querySelector(select.cart.address);

    }
    initActions() {
      const thisCart = this;

      thisCart.dom.toggleTrigger.addEventListener('click', function () {
        thisCart.dom.wrapper.classList.toggle(classNames.cart.wrapperActive);
      });

      thisCart.dom.productList.addEventListener('updated', () => {
        this.update();
      });

      thisCart.dom.productList.addEventListener('remove', (event) => {
        const cartProduct = event.detail.cartProduct;
        thisCart.remove(cartProduct);
      });

      thisCart.dom.form.addEventListener('submit', function (event) {
        event.preventDefault();
        thisCart.sendOrder();
        console.log('Form submission blocked!');
      })

    }

    add(menuProduct) {
      const thisCart = this;



      const generatedHTML = templates.cartProduct(menuProduct);
      const generatedDOM = utils.createDOMFromHTML(generatedHTML);
      thisCart.dom.productList.appendChild(generatedDOM);



      const cartProduct = new CartProduct(menuProduct, generatedDOM);
      thisCart.products.push(cartProduct);

      thisCart.update();
    }

    update() {
      const thisCart = this;

      const deliveryFee = settings.cart.defaultDeliveryFee;

      let totalNumber = 0;
      let subtotalPrice = 0;

      for (const product of thisCart.products) {
        totalNumber += product.amount;
        subtotalPrice += product.price;
      }

      if (totalNumber > 0) {
        thisCart.totalPrice = subtotalPrice + deliveryFee;
      } else {
        thisCart.totalPrice = 0;
      }
      thisCart.totalNumber = totalNumber;
      thisCart.subtotalPrice = subtotalPrice;

      console.log('deliveryFee:', deliveryFee);
      console.log('totalNumber:', totalNumber);
      console.log('subtotalPrice:', subtotalPrice);
      console.log('totalPrice:', thisCart.totalPrice);

      // Виводимо в DOM
      thisCart.dom.totalNumber.innerHTML = thisCart.totalNumber;
      thisCart.dom.subtotalPrice.innerHTML = thisCart.subtotalPrice;
      thisCart.dom.deliveryFee.innerHTML = totalNumber > 0 ? deliveryFee : 0;

      // totalPrice - кілька елементів, оновлюємо всі
      for (let elem of thisCart.dom.totalPrice) {
        elem.innerHTML = thisCart.totalPrice;
      }

    }

    remove(cartProduct) {
      const thisCart = this;

      // 1. Видалити елемент з DOM
      cartProduct.dom.wrapper.remove();

      // 2. Видалити з масиву thisCart.products
      const index = thisCart.products.indexOf(cartProduct);
      if (index !== -1) {
        thisCart.products.splice(index, 1);
      }

      // 3. Оновити підсумки в кошику
      thisCart.update();
    }

    sendOrder() {
      const thisCart = this;

      const url = settings.db.url + '/' + settings.db.orders;
      console.log('url', url);

      const payload = {
        address: thisCart.dom.address.value,
        phone: thisCart.dom.phone.value,
        totalPrice: thisCart.totalPrice,
        subtotalPrice: thisCart.subtotalPrice,
        totalNumber: thisCart.totalNumber,
        deliveryFee: thisCart.dom.deliveryFee.innerHTML,
        products: [],  // поки що пустий масив, будемо пізніше наповнювати
      };
      for (let prod of thisCart.products) {
        payload.products.push(prod.getData());
      }

      console.log('payload:', payload);

      const options = {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      };

      fetch(url, options)
      .then(response => response.json())
        .then(parsedResponse => {
          console.log('Serwer odpowiedział:', parsedResponse);
        });

    }

  }

  class CartProduct {
    constructor(menuProduct, element) {
      const thisCartProduct = this;

      thisCartProduct.id = menuProduct.id;
      thisCartProduct.name = menuProduct.name;
      thisCartProduct.amount = menuProduct.amount;
      thisCartProduct.priceSingle = menuProduct.priceSingle;
      thisCartProduct.price = menuProduct.price;
      thisCartProduct.params = menuProduct.params;

      thisCartProduct.getElements(element);
      thisCartProduct.initAmountWidget();
      thisCartProduct.initActions();

      console.log('thisCartProduct:', thisCartProduct);

    }
    getElements(element) {
      const thisCartProduct = this;

      thisCartProduct.dom = {};
      thisCartProduct.dom.wrapper = element;
      thisCartProduct.dom.amountWidget = element.querySelector(select.cartProduct.amountWidget);
      thisCartProduct.dom.price = element.querySelector(select.cartProduct.price);
      thisCartProduct.dom.edit = element.querySelector(select.cartProduct.edit);
      thisCartProduct.dom.remove = element.querySelector(select.cartProduct.remove);
    }

    getData() {
      const thisCartProduct = this;

      return {
        id: thisCartProduct.id,
        amount: thisCartProduct.amount,
        price: thisCartProduct.price,
        priceSingle: thisCartProduct.priceSingle,
        name: thisCartProduct.name,
        params: thisCartProduct.params,
      };
    }

    initAmountWidget() {
      const thisCartProduct = this;

      thisCartProduct.amountWidget = new amountWidget(thisCartProduct.dom.amountWidget);

      thisCartProduct.dom.amountWidget.addEventListener('updated', function () {

        thisCartProduct.amount = thisCartProduct.amountWidget.value;
        thisCartProduct.price = thisCartProduct.amount * thisCartProduct.priceSingle;
        thisCartProduct.dom.price.innerHTML = thisCartProduct.price;
      });
    }

    remove() {
      const thisCartProduct = this;
      console.log('Removing product:', thisCartProduct);

      const event = new CustomEvent('remove', {
        bubbles: true,
        detail: {
          cartProduct: thisCartProduct,
        },
      });
      thisCartProduct.dom.wrapper.dispatchEvent(event)
    }

    initActions() {
      const thisCartProduct = this;
      thisCartProduct.dom.edit.addEventListener('click', (event) => {
        event.preventDefault();
      });

      thisCartProduct.dom.remove.addEventListener('click', (event) => {
        event.preventDefault();
        thisCartProduct.remove();
      });
    }


  }

  const app = {

    initData: function () {
      const thisApp = this;
      thisApp.data = {};
      const url = settings.db.url + '/' + settings.db.products;
      console.log('url', url);

      fetch(url)
        .then(function (rawResponse) {
          return rawResponse.json();
        })
        .then(function (parsedResponse) {
          console.log('parsedResponse', parsedResponse);

          // * save parsedResponse as thisApp.data.product
          thisApp.data.products = parsedResponse;

          // execute iniMenu method
          thisApp.initMenu();
        });

      console.log('thisApp.data', JSON.stringify(thisApp.data));
    },

    initMenu: function () {
      const thisApp = this;
      console.log('thisApp.data', thisApp.data);

      for (let productData in thisApp.data.products) {
        new Product(thisApp.data.products[productData].id, thisApp.data.products[productData]);
      }
    },

    init: function () {
      const thisApp = this;
      console.log('*** App starting ***');
      console.log('thisApp:', thisApp);
      console.log('classNames:', classNames);
      console.log('settings:', settings);
      console.log('templates:', templates);

      thisApp.initData();
      // thisApp.initMenu();
      thisApp.initCart();


    },

    initCart: function () {
      const thisApp = this;

      const cartElem = document.querySelector(select.containerOf.cart);
      thisApp.cart = new Cart(cartElem);
    }
  };

  app.init();

}

