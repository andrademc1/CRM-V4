
// Funcionalidade para Deal Settings
document.addEventListener('DOMContentLoaded', function() {
  // Array para armazenar os deals configurados
  let configuredDeals = [];
  const savedBookmakerDealsData = document.getElementById('savedBookmakerDealsData');
  
  // Inicializar savedBookmakerDealsData se não existir
  if (!savedBookmakerDealsData.value) {
    savedBookmakerDealsData.value = JSON.stringify([]);
  }

  // Elementos do modal
  const dealConfigModal = document.getElementById('dealConfigModal');
  const closeModalButton = document.querySelector('.close-modal');
  const saveDealConfigButton = document.getElementById('saveDealConfig');
  const toggleDealModeButton = document.getElementById('toggleDealMode');
  const dealConfigSingleMode = document.getElementById('dealConfigSingleMode');
  const dealConfigMultiMode = document.getElementById('dealConfigMultiMode');

  // Referências aos elementos de deal settings
  const noDealAccounts = document.getElementById('noDealAccounts');
  const dealSettingsContainer = document.getElementById('dealSettingsContainer');
  const accountDealList = document.getElementById('accountDealList');

  // Função para atualizar a interface de Deal Settings com base nas contas salvas
  function updateDealSettingsInterface() {
    const savedAccountsData = document.getElementById('savedBookmakerAccountsData');
    const savedAccounts = JSON.parse(savedAccountsData.value || '[]');
    
    // Verificar se existem contas salvas
    if (savedAccounts.length === 0) {
      noDealAccounts.style.display = 'block';
      dealSettingsContainer.style.display = 'none';
      return;
    }

    // Mostrar container de deals e esconder mensagem
    noDealAccounts.style.display = 'none';
    dealSettingsContainer.style.display = 'block';

    // Limpar lista atual
    accountDealList.innerHTML = '';

    // Para cada conta, criar um card para configuração de deal
    savedAccounts.forEach((account, index) => {
      const card = document.createElement('div');
      card.className = 'account-deal-card';
      card.dataset.accountIndex = index;

      // Verificar se já existe um deal configurado para esta conta
      const existingDeal = configuredDeals.find(deal => deal.accountIndex === index);
      const dealConfigured = existingDeal !== undefined;

      // Países associados a esta conta (para exibição)
      let countriesHtml = '';
      if (account.countries && account.countries.length > 0) {
        countriesHtml = '<p><strong>Países associados:</strong></p><div class="account-countries">';
        account.countries.forEach(country => {
          countriesHtml += `<span class="country-mini-badge"><span class="country-flag">${country.flag}</span> ${country.name}</span>`;
        });
        countriesHtml += '</div>';
      }

      // Status do deal
      const statusClass = dealConfigured ? 'deal-status-configured' : 'deal-status-pending';
      const statusText = dealConfigured ? 'Configurado' : 'Pendente';

      // Informações do deal configurado
      let dealInfoHtml = '';
      if (dealConfigured) {
        if (existingDeal.isMultiGeography) {
          dealInfoHtml = '<p><strong>Tipo:</strong> Multi-Geografia</p>';
        } else {
          dealInfoHtml = `
            <p><strong>Tipo:</strong> ${existingDeal.dealType}</p>
            <p><strong>Descrição:</strong> ${existingDeal.dealDescription || 'N/A'}</p>
          `;
        }
      }

      // Montar HTML do card
      card.innerHTML = `
        <h5>${account.owner}</h5>
        <span class="deal-status ${statusClass}">${statusText}</span>
        ${dealInfoHtml}
        ${countriesHtml}
        <button type="button" class="configure-deal-btn" data-account-index="${index}">Configurar Deal</button>
      `;

      accountDealList.appendChild(card);

      // Adicionar event listener para o botão de configurar deal
      const configureButton = card.querySelector('.configure-deal-btn');
      configureButton.addEventListener('click', function(e) {
        e.preventDefault(); // Impedir submissão do formulário
        openDealConfigModal(parseInt(this.dataset.accountIndex));
      });
    });
  }

  // Função para abrir o modal de configuração de deal
  function openDealConfigModal(accountIndex) {
    // Configurar modal para o accountIndex atual
    dealConfigModal.dataset.accountIndex = accountIndex;

    // Verificar se já existe um deal configurado para esta conta
    const existingDeal = configuredDeals.find(deal => deal.accountIndex === accountIndex);
    
    // Configurar o estado do modal com base no deal existente ou padrão
    if (existingDeal) {
      // Se já existe deal, carregar seus dados
      if (existingDeal.isMultiGeography) {
        // Mostrar modo multi e esconder modo single
        dealConfigSingleMode.style.display = 'none';
        dealConfigMultiMode.style.display = 'block';
        toggleDealModeButton.textContent = 'Mudar para Deal Único';
        
        // Preencher os campos de multi geografia
        populateMultiGeographyFields(accountIndex, existingDeal.geographyDeals || []);
      } else {
        // Mostrar modo single e esconder modo multi
        dealConfigSingleMode.style.display = 'block';
        dealConfigMultiMode.style.display = 'none';
        toggleDealModeButton.textContent = 'Configurar por Geografia';
        
        // Preencher os campos de deal único
        document.getElementById('dealType').value = existingDeal.dealType || '';
        document.getElementById('dealDescription').value = existingDeal.dealDescription || '';
      }
    } else {
      // Se não existe deal, iniciar em modo single padrão
      dealConfigSingleMode.style.display = 'block';
      dealConfigMultiMode.style.display = 'none';
      toggleDealModeButton.textContent = 'Configurar por Geografia';
      
      // Limpar campos
      document.getElementById('dealType').value = '';
      document.getElementById('dealDescription').value = '';
    }

    // Exibir modal
    dealConfigModal.style.display = 'block';
  }

  // Função para preencher os campos de deal multi geografia
  function populateMultiGeographyFields(accountIndex, geographyDeals) {
    const geographyDealsContainer = document.getElementById('geographyDealsContainer');
    geographyDealsContainer.innerHTML = '';
    
    // Obter a conta atual
    const savedAccounts = JSON.parse(document.getElementById('savedBookmakerAccountsData').value || '[]');
    const account = savedAccounts[accountIndex];
    
    if (!account || !account.countries || account.countries.length === 0) {
      geographyDealsContainer.innerHTML = '<p>Esta conta não tem países associados</p>';
      return;
    }
    
    // Para cada país associado à conta, criar um item de deal
    account.countries.forEach(country => {
      // Verificar se já existe um deal configurado para este país
      const existingGeoDeal = geographyDeals.find(deal => deal.countryCode === country.code);
      
      const item = document.createElement('div');
      item.className = 'geography-deal-item';
      item.dataset.countryCode = country.code;
      
      item.innerHTML = `
        <div class="geography-flag-name">
          <span class="country-flag">${country.flag}</span>
          <span>${country.name}</span>
        </div>
        <div class="form-group">
          <label>Deal Type:</label>
          <select class="geo-deal-type">
            <option value="">Selecione um tipo</option>
            <option value="Rev Share" ${existingGeoDeal && existingGeoDeal.dealType === 'Rev Share' ? 'selected' : ''}>Rev Share</option>
            <option value="CPA" ${existingGeoDeal && existingGeoDeal.dealType === 'CPA' ? 'selected' : ''}>CPA</option>
            <option value="Hybrid" ${existingGeoDeal && existingGeoDeal.dealType === 'Hybrid' ? 'selected' : ''}>Hybrid</option>
            <option value="Flat Fee" ${existingGeoDeal && existingGeoDeal.dealType === 'Flat Fee' ? 'selected' : ''}>Flat Fee</option>
            <option value="Other" ${existingGeoDeal && existingGeoDeal.dealType === 'Other' ? 'selected' : ''}>Other</option>
          </select>
        </div>
        <div class="form-group">
          <label>Deal Description:</label>
          <textarea class="geo-deal-description" rows="2">${existingGeoDeal ? existingGeoDeal.dealDescription || '' : ''}</textarea>
        </div>
      `;
      
      geographyDealsContainer.appendChild(item);
    });
  }

  // Função para salvar configuração de deal
  function saveDealConfiguration() {
    const accountIndex = parseInt(dealConfigModal.dataset.accountIndex);
    const isMultiMode = dealConfigMultiMode.style.display === 'block';
    
    // Validar dados antes de salvar
    if (!isMultiMode) {
      const dealType = document.getElementById('dealType').value;
      if (!dealType) {
        alert('Por favor, selecione um tipo de deal');
        return;
      }
    }

    // Remover deal existente se houver
    const existingDealIndex = configuredDeals.findIndex(deal => deal.accountIndex === accountIndex);
    if (existingDealIndex !== -1) {
      configuredDeals.splice(existingDealIndex, 1);
    }

    // Obter a conta para associar as geografias
    const savedAccounts = JSON.parse(document.getElementById('savedBookmakerAccountsData').value || '[]');
    const account = savedAccounts[accountIndex];
    const geographies = account && account.countries ? account.countries.map(c => ({ code: c.code, name: c.name })) : [];

    // Criar novo deal
    let newDeal = {
      accountIndex: accountIndex,
      isMultiGeography: isMultiMode,
      geographies: geographies,
      defaultDeal: true // Por padrão, considerar como deal principal
    };

    if (isMultiMode) {
      // Coletar dados de deal por geografia
      const geographyItems = document.querySelectorAll('.geography-deal-item');
      const geographyDeals = [];

      geographyItems.forEach(item => {
        const countryCode = item.dataset.countryCode;
        const dealType = item.querySelector('.geo-deal-type').value;
        const dealDescription = item.querySelector('.geo-deal-description').value;
        
        if (dealType) { // Só adicionar se tiver pelo menos o tipo selecionado
          geographyDeals.push({
            countryCode: countryCode,
            dealType: dealType,
            dealDescription: dealDescription
          });
        }
      });

      newDeal.geographyDeals = geographyDeals;
      
      // Validar se pelo menos um país tem deal configurado
      if (geographyDeals.length === 0) {
        alert('Configure pelo menos um deal por geografia');
        return;
      }
    } else {
      // Coletar dados de deal geral
      newDeal.dealType = document.getElementById('dealType').value;
      newDeal.dealDescription = document.getElementById('dealDescription').value;
    }

    // Adicionar à lista de deals
    configuredDeals.push(newDeal);

    // Atualizar o input hidden
    savedBookmakerDealsData.value = JSON.stringify(configuredDeals);

    // Fechar modal
    dealConfigModal.style.display = 'none';

    // Atualizar interface
    updateDealSettingsInterface();
  }

  // Event listener para fechar o modal quando clicar no X
  if (closeModalButton) {
    closeModalButton.addEventListener('click', function() {
      dealConfigModal.style.display = 'none';
    });
  }

  // Event listener para fechar o modal quando clicar fora dele
  window.addEventListener('click', function(event) {
    if (event.target === dealConfigModal) {
      dealConfigModal.style.display = 'none';
    }
  });

  // Event listener para salvar a configuração de deal
  if (saveDealConfigButton) {
    saveDealConfigButton.addEventListener('click', saveDealConfiguration);
  }

  // Event listener para alternar entre modos single e multi
  if (toggleDealModeButton) {
    toggleDealModeButton.addEventListener('click', function() {
      if (dealConfigSingleMode.style.display === 'block') {
        // Mudar para modo multi
        dealConfigSingleMode.style.display = 'none';
        dealConfigMultiMode.style.display = 'block';
        this.textContent = 'Mudar para Deal Único';
        
        // Preencher campos de geografia
        const accountIndex = parseInt(dealConfigModal.dataset.accountIndex);
        populateMultiGeographyFields(accountIndex, []);
      } else {
        // Mudar para modo single
        dealConfigSingleMode.style.display = 'block';
        dealConfigMultiMode.style.display = 'none';
        this.textContent = 'Configurar por Geografia';
      }
    });
  }

  // Observar mudanças na aba de contas
  const tabLinks = document.querySelectorAll('.tab-link');
  tabLinks.forEach(tab => {
    tab.addEventListener('click', function() {
      if (this.dataset.tab === 'bookmakerDealSettings') {
        updateDealSettingsInterface();
      }
    });
  });

  // Observar mudanças nas contas
  const savedAccountsData = document.getElementById('savedBookmakerAccountsData');
  if (savedAccountsData) {
    const observer = new MutationObserver(function(mutations) {
      mutations.forEach(function(mutation) {
        if (mutation.type === 'attributes' && mutation.attributeName === 'value') {
          updateDealSettingsInterface();
        }
      });
    });
    
    observer.observe(savedAccountsData, { attributes: true });
  }
});
