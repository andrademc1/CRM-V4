
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
});
