document.addEventListener('DOMContentLoaded', function() {
  // Array para armazenar contas de faturamento salvas
  const savedAccounts = [];
  const savedBillingAccounts = document.getElementById('savedBillingAccounts');
  const billingAccountsList = document.getElementById('billingAccountsList');

  // Função para adicionar um cartão de conta visual à lista
  function addAccountCard(account) {
    const newAccountCard = document.createElement('div');
    newAccountCard.classList.add('billing-account-card');
    newAccountCard.innerHTML = `
      <h3>${account.name}</h3>
      <p>VAT: ${account.vat || 'N/A'}</p>
      <p>Address: ${account.address1 || 'N/A'}</p>
      <p>City: ${account.city || 'N/A'}, ${account.state || ''} ${account.zipCode || ''}</p>
      <p>Country: ${account.country || 'N/A'}</p>
    `;
    billingAccountsList.appendChild(newAccountCard);
  }

  // Inicializar Tab
  function openTab(tabName) {
    const tabContents = document.getElementsByClassName('tab-content');
    for (let i = 0; i < tabContents.length; i++) {
      tabContents[i].style.display = 'none';
    }

    const tabLinks = document.getElementsByClassName('tab-link');
    for (let i = 0; i < tabLinks.length; i++) {
      tabLinks[i].classList.remove('active');
    }

    document.getElementById(tabName).style.display = 'block';
    document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');
  }

  // Adicionar eventos de clique às tabs
  const tabLinks = document.getElementsByClassName('tab-link');
  for (let i = 0; i < tabLinks.length; i++) {
    tabLinks[i].addEventListener('click', function() {
      const tabId = this.getAttribute('data-tab');
      openTab(tabId);
    });
  }

  // Inicializar o seletor de países
  const countrySearchInput = document.getElementById('countrySearch');
  const countryList = document.getElementById('countryList');
  const selectedCountryDisplay = document.getElementById('selectedCountry');
  const countryCodeInput = document.getElementById('countryCode');

  if (countrySearchInput && countryList) {
    // Popular a lista de países
    if (window.countries && Array.isArray(window.countries)) {
      for (const country of window.countries) {
        const li = document.createElement('li');
        li.setAttribute('data-code', country.code);
        li.setAttribute('data-name', country.name);
        li.textContent = `${country.flag} ${country.name}`;

        li.addEventListener('click', function() {
          const code = this.getAttribute('data-code');
          const name = this.getAttribute('data-name');

          selectedCountryDisplay.textContent = name;
          countryCodeInput.value = code;
          countryList.style.display = 'none';
        });

        countryList.appendChild(li);
      }
    } else {
      console.error('O array de países não está disponível.');
    }

    // Mostrar a lista quando clica no display do país
    selectedCountryDisplay.addEventListener('click', function() {
      countryList.style.display = 'block';
    });

    // Mostrar a lista quando clica no input
    countrySearchInput.addEventListener('click', function() {
      countryList.style.display = 'block';
    });

    // Filtrar a lista ao digitar
    countrySearchInput.addEventListener('input', function() {
      const searchValue = this.value.toLowerCase();
      const items = countryList.getElementsByTagName('li');

      for (let i = 0; i < items.length; i++) {
        const countryName = items[i].getAttribute('data-name').toLowerCase();
        if (countryName.indexOf(searchValue) > -1) {
          items[i].style.display = "";
        } else {
          items[i].style.display = "none";
        }
      }
    });

    // Fechar a lista quando clica fora
    document.addEventListener('click', function(e) {
      if (e.target !== countrySearchInput && 
          e.target !== selectedCountryDisplay && 
          !countryList.contains(e.target)) {
        countryList.style.display = 'none';
      }
    });
  }

  // Abrir a primeira tab por padrão
  openTab('tabOwnerSettings');

  // Upload de logotipo com pré-visualização
  const logoInput = document.getElementById('ownerLogo');
  if (logoInput) {
    logoInput.addEventListener('change', function(event) {
      const file = event.target.files[0];
      const preview = document.getElementById('logoPreview');

      if (file) {
        const reader = new FileReader();

        reader.onload = function(e) {
          preview.src = e.target.result;
          preview.style.display = 'block';
        };

        reader.readAsDataURL(file);
      } else {
        preview.src = '';
        preview.style.display = 'none';
      }
    });
  }

  // Adicionar um campo oculto ao formulário no momento do envio
  const form = document.querySelector('form');
  if (form) {
    form.addEventListener('submit', function(e) {
      // Verificar se há contas salvas e criar um campo hidden para enviá-las
      if (savedAccounts.length > 0) {
        const hiddenField = document.createElement('input');
        hiddenField.type = 'hidden';
        hiddenField.name = 'billingAccounts';
        hiddenField.value = JSON.stringify(savedAccounts);
        this.appendChild(hiddenField);
        console.log('Enviando billing accounts:', savedAccounts);
      }
    });
  }

  // Gerenciar a visibilidade dos campos de detalhes de faturação
  const billingRadios = document.querySelectorAll('input[name="applyBilling"]');
  const billingDetailsSection = document.getElementById('billingDetailsSection');
  const addAccountButtonSection = document.getElementById('addBillingDetailsButtonSection');
  const addAccountButton = document.getElementById('addBillingDetailsButton');

  if (billingRadios.length > 0) {
    billingRadios.forEach(radio => {
      radio.addEventListener('change', function() {
        if (this.value === 'yes') {
          addAccountButtonSection.style.display = 'block';
          billingDetailsSection.style.display = 'none';
        } else {
          addAccountButtonSection.style.display = 'none';
          billingDetailsSection.style.display = 'block';
        }
      });
    });
  }

  // Adicionar evento ao botão Add Billing Details
  if (addAccountButton) {
    addAccountButton.addEventListener('click', function() {
      billingDetailsSection.style.display = 'block';
    });
  }

  // Evento para salvar detalhes de faturamento
  const saveBillingButton = document.getElementById('saveBillingButton');
  if (saveBillingButton) {
    saveBillingButton.addEventListener('click', function() {
      // Obter valores do formulário
      const name = document.getElementById('billingName').value;
      const vat = document.getElementById('billingVat').value;
      const address1 = document.getElementById('billingAddress1').value;
      const address2 = document.getElementById('billingAddress2').value;
      const city = document.getElementById('billingCity').value;
      const state = document.getElementById('billingState').value;
      const zipCode = document.getElementById('billingZipCode').value;
      const countryElement = document.getElementById('selectedCountry');
      const country = countryElement ? countryElement.textContent : '';
      const countryCode = document.getElementById('countryCode').value;

      // Validar campos obrigatórios
      if (!name) {
        alert('Please enter a billing name');
        return;
      }

      // Criar objeto de conta
      const accountData = {
        name,
        vat,
        address1,
        address2,
        city,
        state,
        zipCode,
        country,
        countryCode
      };

      // Adicionar ao array de contas
      savedAccounts.push(accountData);

      // Mostrar a seção de contas salvas
      if (savedBillingAccounts) {
        savedBillingAccounts.style.display = 'block';
      }

      // Adicionar card visual para a conta
      if (billingAccountsList) {
        addAccountCard(accountData);
      }

      // Limpar formulário
      document.getElementById('billingName').value = '';
      document.getElementById('billingVat').value = '';
      document.getElementById('billingAddress1').value = '';
      document.getElementById('billingAddress2').value = '';
      document.getElementById('billingCity').value = '';
      document.getElementById('billingState').value = '';
      document.getElementById('billingZipCode').value = '';
      document.getElementById('selectedCountry').textContent = 'Select a country';
      document.getElementById('countryCode').value = '';

      alert("Billing details saved!");
    });
  }

  // Adicionar outra conta
  const addMoreAccountButton = document.getElementById('addMoreAccountButton');
  if (addMoreAccountButton) {
    addMoreAccountButton.addEventListener('click', function() {
      // Limpar formulário para nova entrada
      document.getElementById('billingName').value = '';
      document.getElementById('billingVat').value = '';
      document.getElementById('billingAddress1').value = '';
      document.getElementById('billingAddress2').value = '';
      document.getElementById('billingCity').value = '';
      document.getElementById('billingState').value = '';
      document.getElementById('billingZipCode').value = '';
      document.getElementById('selectedCountry').textContent = 'Select a country';
      document.getElementById('countryCode').value = '';
    });
  }
});