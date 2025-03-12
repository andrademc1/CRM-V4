document.addEventListener('DOMContentLoaded', function() {
  // Função para mudar entre abas
  function openTab(evt, tabName) {
    var i, tabcontent, tablinks;

    // Esconde todos os conteúdos das abas
    tabcontent = document.getElementsByClassName("tab-content");
    for (i = 0; i < tabcontent.length; i++) {
      tabcontent[i].style.display = "none";
    }

    // Remove a classe "active" de todos os botões de abas
    tablinks = document.getElementsByClassName("tab-link");
    for (i = 0; i < tablinks.length; i++) {
      tablinks[i].className = tablinks[i].className.replace(" active", "");
    }

    // Mostra o conteúdo da aba atual e adiciona a classe "active" ao botão clicado
    document.getElementById(tabName).style.display = "block";
    evt.currentTarget.className += " active";
  }

  // Adiciona eventos de clique para todas as abas
  const tabLinks = document.querySelectorAll('.tab-link');
  tabLinks.forEach(tab => {
    tab.addEventListener('click', function(e) {
      openTab(e, this.getAttribute('data-tab'));
    });
  });

  // Abre a primeira aba por padrão
  if (tabLinks.length > 0) {
    tabLinks[0].click();
  }

  // Gerenciar a visibilidade dos campos de detalhes de faturação
  const billingRadios = document.querySelectorAll('input[name="applyBilling"]');
  const billingDetailsSection = document.getElementById('billingDetailsSection');
  const addAccountButtonSection = document.getElementById('addAccountButtonSection');
  const addAccountButton = document.getElementById('addAccountButton');

  billingRadios.forEach(radio => {
    radio.addEventListener('change', function() {
      if (this.value === 'yes') {
        addAccountButtonSection.style.display = 'block';
        billingDetailsSection.style.display = 'none';
      } else {
        addAccountButtonSection.style.display = 'none';
        billingDetailsSection.style.display = 'none';
      }
    });
  });

  // Adicionar evento ao botão Add Account
  if (addAccountButton) {
    addAccountButton.addEventListener('click', function() {
      billingDetailsSection.style.display = 'block';
    });
  }

  // Inicializar o seletor de países
  const countrySearchInput = document.getElementById('countrySearch');
  const countryList = document.getElementById('countryList');
  const selectedCountryDisplay = document.getElementById('selectedCountry');
  let selectedCountryCode = '';

  // Preencher a lista de países
  if (typeof countries !== 'undefined' && countryList) {
    countries.forEach(country => {
      const li = document.createElement('li');
      li.innerHTML = `<span class="country-flag">${country.flag}</span> ${country.name}`;
      li.setAttribute('data-code', country.code);
      li.setAttribute('data-name', country.name);
      li.setAttribute('data-flag', country.flag);

      li.addEventListener('click', function() {
        selectedCountryCode = this.getAttribute('data-code');
        const countryName = this.getAttribute('data-name');
        const countryFlag = this.getAttribute('data-flag');

        document.getElementById('countryCode').value = selectedCountryCode;
        selectedCountryDisplay.innerHTML = `${countryFlag} ${countryName}`;
        countryList.style.display = 'none';
        countrySearchInput.value = '';
      });

      countryList.appendChild(li);
    });
  }

  // Filtragem da lista de países
  if (countrySearchInput) {
    countrySearchInput.addEventListener('focus', function() {
      countryList.style.display = 'block';
    });

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
      if (e.target !== countrySearchInput && !countryList.contains(e.target)) {
        countryList.style.display = 'none';
      }
    });
  }

  // Manipular o upload de logo
  const logoInput = document.getElementById('ownerLogo');
  const logoPreview = document.getElementById('logoPreview');

  if (logoInput && logoPreview) {
    logoInput.addEventListener('change', function() {
      const file = this.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = function(e) {
          logoPreview.src = e.target.result;
          logoPreview.style.display = 'block';
        }
        reader.readAsDataURL(file);
      }
    });
  }

  // Botões para gerenciar billing details
  const saveBillingButton = document.getElementById('saveBillingButton');
  const addMoreAccountButton = document.getElementById('addMoreAccountButton');
  const savedBillingAccounts = document.getElementById('savedBillingAccounts');
  const billingAccountsList = document.getElementById('billingAccountsList');

  // Array para armazenar contas salvas
  let savedAccounts = [];

  if (saveBillingButton) {
    saveBillingButton.addEventListener('click', function() {
      // Obter valores do formulário
      const billingName = document.getElementById('billingName').value;
      const billingVat = document.getElementById('billingVat').value;
      const billingAddress1 = document.getElementById('billingAddress1').value;
      const billingAddress2 = document.getElementById('billingAddress2').value;
      const billingCity = document.getElementById('billingCity').value;
      const billingState = document.getElementById('billingState').value;
      const billingZipCode = document.getElementById('billingZipCode').value;
      const countryCode = document.getElementById('countryCode').value;
      const selectedCountry = document.getElementById('selectedCountry').textContent;

      // Validar se pelo menos o nome foi preenchido
      if (!billingName) {
        alert('Please enter at least the billing name.');
        return;
      }

      // Criar objeto com os dados da conta
      const accountData = {
        name: billingName,
        vat: billingVat,
        address1: billingAddress1,
        address2: billingAddress2,
        city: billingCity,
        state: billingState,
        zipCode: billingZipCode,
        countryCode: countryCode,
        country: selectedCountry !== 'Select a country' ? selectedCountry : ''
      };

      // Adicionar ao array de contas
      savedAccounts.push(accountData);

      // Criar e adicionar cartão visual para a conta
      createAccountCard(accountData);

      // Mostrar seção de contas salvas
      savedBillingAccounts.style.display = 'block';

      // Limpar campos para possível nova entrada
      clearBillingForm();

      alert('Billing details saved successfully!');
    });
  }

  if (addMoreAccountButton) {
    addMoreAccountButton.addEventListener('click', function() {
      clearBillingForm();
      alert('Form cleared. You can now add another account.');
    });
  }

  // Função para criar cartão visual de conta
  function createAccountCard(accountData) {
    const card = document.createElement('div');
    card.className = 'account-card';

    // Criar cabeçalho com nome da conta
    const title = document.createElement('h5');
    title.textContent = accountData.name;
    card.appendChild(title);

    // Adicionar VAT se existir
    if (accountData.vat) {
      const vat = document.createElement('p');
      vat.innerHTML = '<strong>VAT:</strong> ' + accountData.vat;
      card.appendChild(vat);
    }

    // Adicionar seção de endereço
    const addressSection = document.createElement('div');
    addressSection.className = 'account-address';

    // Montar endereço completo
    let addressHTML = '';
    if (accountData.address1) {
      addressHTML += '<p>' + accountData.address1 + '</p>';
    }
    if (accountData.address2) {
      addressHTML += '<p>' + accountData.address2 + '</p>';
    }

    let cityLine = '';
    if (accountData.city) {
      cityLine += accountData.city;
    }
    if (accountData.state) {
      cityLine += cityLine ? ', ' + accountData.state : accountData.state;
    }
    if (accountData.zipCode) {
      cityLine += cityLine ? ' ' + accountData.zipCode : accountData.zipCode;
    }

    if (cityLine) {
      addressHTML += '<p>' + cityLine + '</p>';
    }

    if (accountData.country && accountData.country !== 'Select a country') {
      addressHTML += '<p>' + accountData.country + '</p>';
    }

    if (addressHTML) {
      addressSection.innerHTML = '<strong>Address:</strong>' + addressHTML;
      card.appendChild(addressSection);
    }

    // Adicionar ao container de contas
    billingAccountsList.appendChild(card);
  }

  // Função para limpar o formulário
  function clearBillingForm() {
    document.getElementById('billingName').value = '';
    document.getElementById('billingVat').value = '';
    document.getElementById('billingAddress1').value = '';
    document.getElementById('billingAddress2').value = '';
    document.getElementById('billingCity').value = '';
    document.getElementById('billingState').value = '';
    document.getElementById('billingZipCode').value = '';
    document.getElementById('countryCode').value = '';
    document.getElementById('selectedCountry').textContent = 'Select a country';
  }

  // Inicializar visualização da aba selecionada
  showTab('tabOwnerSettings');

  // Upload de logotipo com pré-visualização
  document.getElementById('ownerLogo').addEventListener('change', function(event) {
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

  // Adicionar um campo oculto ao formulário no momento do envio
  document.querySelector('form').addEventListener('submit', function(e) {
    // Verificar se há contas salvas e create um campo hidden para enviá-las
    if (savedAccounts.length > 0) {
      const hiddenField = document.createElement('input');
      hiddenField.type = 'hidden';
      hiddenField.name = 'billingAccounts';
      hiddenField.value = JSON.stringify(savedAccounts);
      this.appendChild(hiddenField);
    }
  });
});