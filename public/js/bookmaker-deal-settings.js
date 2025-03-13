
// Funcionalidade para Deal Settings
document.addEventListener('DOMContentLoaded', function() {
  // Função para atualizar a interface de Deal Settings com base nas contas salvas
  function updateDealSettingsInterface() {
    const savedAccounts = JSON.parse(document.getElementById('savedBookmakerAccountsData').value || '[]');
    const accountDealList = document.getElementById('accountDealList');
    const noDealAccounts = document.getElementById('noDealAccounts');
    const dealSettingsContainer = document.getElementById('dealSettingsContainer');

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
      const deals = JSON.parse(document.getElementById('savedBookmakerDealsData').value || '[]');
      const accountDeal = deals.find(deal => deal.accountIndex === index);

      let statusClass = accountDeal ? 'deal-status-configured' : 'deal-status-pending';
      let statusText = accountDeal ? 'Configurado' : 'Pendente';

      let countriesInfo = '';
      if (account.countries && account.countries.length > 0) {
        countriesInfo = `<p><strong>Geografias:</strong> ${account.countries.length} associadas</p>`;
      } else {
        countriesInfo = '<p><strong>Geografias:</strong> Nenhuma</p>';
      }

      card.innerHTML = `
        <span class="deal-status ${statusClass}">${statusText}</span>
        <h5>${account.owner}</h5>
        <p><strong>Username:</strong> ${account.username}</p>
        ${countriesInfo}
        <button class="configure-deal-btn" data-account-index="${index}">Configurar Deal</button>
      `;

      accountDealList.appendChild(card);
    });

    // Adicionar eventos para botões de configuração
    document.querySelectorAll('.configure-deal-btn').forEach(button => {
      button.addEventListener('click', function(e) {
        e.preventDefault(); // Impedir comportamento padrão do botão
        const accountIndex = parseInt(this.dataset.accountIndex);
        openDealConfigModal(accountIndex);
      });
    });
  }

  // Função para abrir modal de configuração de deal
  function openDealConfigModal(accountIndex) {
    const modal = document.getElementById('dealConfigModal');
    const account = JSON.parse(document.getElementById('savedBookmakerAccountsData').value || '[]')[accountIndex];
    const dealConfigSingleMode = document.getElementById('dealConfigSingleMode');
    const dealConfigMultiMode = document.getElementById('dealConfigMultiMode');
    const toggleDealModeBtn = document.getElementById('toggleDealMode');
    const saveDealConfigBtn = document.getElementById('saveDealConfig');

    // Armazenar o índice da conta no modal para uso posterior
    modal.dataset.accountIndex = accountIndex;

    // Verificar se a conta tem múltiplas geografias
    const hasMultipleGeographies = account.countries && account.countries.length > 1;

    // Se não tiver múltiplas geografias, desabilitar botão de toggle
    toggleDealModeBtn.disabled = !hasMultipleGeographies;
    toggleDealModeBtn.style.display = hasMultipleGeographies ? 'block' : 'none';

    // Iniciar no modo single
    dealConfigSingleMode.style.display = 'block';
    dealConfigMultiMode.style.display = 'none';

    // Resetar estado do modo e armazenar no modal
    modal.dataset.isMultiMode = 'false';

    // Carregar dados existentes se houver
    const deals = JSON.parse(document.getElementById('savedBookmakerDealsData').value || '[]');
    const existingDeal = deals.find(deal => deal.accountIndex === accountIndex);

    if (existingDeal) {
      if (existingDeal.isMultiGeography) {
        // Se for multi-geografia, preencher o modo multi
        modal.dataset.isMultiMode = 'true';
        dealConfigSingleMode.style.display = 'none';
        dealConfigMultiMode.style.display = 'block';
        toggleDealModeBtn.textContent = 'Configurar para Todos';

        // Preencher dados para cada geografia
        populateGeographyDeals(account.countries, existingDeal.geographyDeals);
      } else {
        // Se for single, preencher o modo single
        document.getElementById('dealType').value = existingDeal.dealType || 'Rev Share';
        document.getElementById('dealDescription').value = existingDeal.dealDescription || '';
      }
    }

    // Mostrar modal
    modal.style.display = 'block';

    // Configurar evento para fechar o modal
    document.querySelector('.close-modal').onclick = function() {
      modal.style.display = 'none';
    };

    // Fechar modal clicando fora
    window.onclick = function(event) {
      if (event.target === modal) {
        modal.style.display = 'none';
      }
    };

    // Configurar toggle entre modos
    toggleDealModeBtn.onclick = function(e) {
      e.preventDefault(); // Prevenir comportamento padrão
      const isMultiMode = modal.dataset.isMultiMode === 'true';
      
      // Alternar o modo
      modal.dataset.isMultiMode = isMultiMode ? 'false' : 'true';
      
      if (modal.dataset.isMultiMode === 'true') {
        dealConfigSingleMode.style.display = 'none';
        dealConfigMultiMode.style.display = 'block';
        this.textContent = 'Configurar para Todos';

        // Preencher dados de geografia
        populateGeographyDeals(account.countries, 
          existingDeal && existingDeal.isMultiGeography ? existingDeal.geographyDeals : null);
      } else {
        dealConfigSingleMode.style.display = 'block';
        dealConfigMultiMode.style.display = 'none';
        this.textContent = 'Configurar por Geografia';
      }
    };

    // Configurar salvamento
    saveDealConfigBtn.onclick = function(e) {
      e.preventDefault(); // Prevenir comportamento padrão
      saveDealConfiguration(accountIndex, modal.dataset.isMultiMode === 'true');
    };
  }

  // Função para popular as configurações de geografia
  function populateGeographyDeals(countries, existingGeographyDeals) {
    const container = document.getElementById('geographyDealsContainer');
    container.innerHTML = '';

    if (!countries || countries.length === 0) {
      container.innerHTML = '<p>Nenhuma geografia disponível para esta conta.</p>';
      return;
    }

    countries.forEach((country) => {
      const existingDeal = existingGeographyDeals ? 
        existingGeographyDeals.find(deal => deal.countryCode === country.code) : null;

      const dealType = existingDeal ? existingDeal.dealType : 'Rev Share';
      const dealDescription = existingDeal ? existingDeal.dealDescription : '';

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
            <option value="Rev Share" ${dealType === 'Rev Share' ? 'selected' : ''}>Rev Share</option>
            <option value="CPA" ${dealType === 'CPA' ? 'selected' : ''}>CPA</option>
            <option value="Hybrid" ${dealType === 'Hybrid' ? 'selected' : ''}>Hybrid</option>
            <option value="Flat Fee" ${dealType === 'Flat Fee' ? 'selected' : ''}>Flat Fee</option>
            <option value="Other" ${dealType === 'Other' ? 'selected' : ''}>Other</option>
          </select>
        </div>

        <div class="form-group">
          <label>Deal Description:</label>
          <textarea class="geo-deal-description" rows="2">${dealDescription}</textarea>
        </div>
      `;

      container.appendChild(item);
    });
  }

  // Função para salvar configuração de deal
  function saveDealConfiguration(accountIndex, isMultiMode) {
    // Validar dados antes de salvar
    if (!isMultiMode) {
      const dealType = document.getElementById('dealType').value;
      if (!dealType) {
        alert('Por favor, selecione um tipo de deal');
        return;
      }
    }

    const deals = JSON.parse(document.getElementById('savedBookmakerDealsData').value || '[]');

    // Remover deal existente se houver
    const existingDealIndex = deals.findIndex(deal => deal.accountIndex === accountIndex);
    if (existingDealIndex !== -1) {
      deals.splice(existingDealIndex, 1);
    }

    // Criar novo deal
    let newDeal = {
      accountIndex: accountIndex,
      isMultiGeography: isMultiMode
    };

    if (isMultiMode) {
      // Coletar dados de deal por geografia
      const geographyItems = document.querySelectorAll('.geography-deal-item');
      const geographyDeals = [];

      geographyItems.forEach(item => {
        geographyDeals.push({
          countryCode: item.dataset.countryCode,
          dealType: item.querySelector('.geo-deal-type').value,
          dealDescription: item.querySelector('.geo-deal-description').value
        });
      });

      newDeal.geographyDeals = geographyDeals;
    } else {
      // Coletar dados de deal geral
      newDeal.dealType = document.getElementById('dealType').value;
      newDeal.dealDescription = document.getElementById('dealDescription').value;
    }

    // Adicionar à lista de deals
    deals.push(newDeal);

    // Atualizar o input hidden
    document.getElementById('savedBookmakerDealsData').value = JSON.stringify(deals);

    // Fechar modal
    document.getElementById('dealConfigModal').style.display = 'none';

    // Atualizar interface
    updateDealSettingsInterface();

    alert('Deal configurado com sucesso!');
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

  // Inicializar savedBookmakerDealsData se não existir
  if (!document.getElementById('savedBookmakerDealsData').value) {
    document.getElementById('savedBookmakerDealsData').value = JSON.stringify([]);
  }

  // Observar mudanças nas contas
  const observer = new MutationObserver(function() {
    updateDealSettingsInterface();
  });

  // Observar o container de contas salvas
  const accountsList = document.getElementById('accountsList');
  if (accountsList) {
    observer.observe(accountsList, { childList: true });
  }
});
