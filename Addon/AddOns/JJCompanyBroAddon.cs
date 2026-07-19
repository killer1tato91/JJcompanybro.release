#region Using declarations
using System;
using System.Text;
using System.Net;
using System.Collections.Generic;
using System.Timers;
using NinjaTrader.Cbi;
using NinjaTrader.NinjaScript;
using System.Threading.Tasks;
using System.IO;
using System.Text.RegularExpressions;
using System.Windows;
using System.Windows.Controls;
using NinjaTrader.Gui.Tools;
#endregion

namespace NinjaTrader.NinjaScript.AddOns
{
    public class JJCompanyBroAddon : AddOnBase
    {
        private Timer accountTimer;
        private Timer commandTimer;
        private Dictionary<string, double> entryPrices = new Dictionary<string, double>();
        private Dictionary<string, double> lastRealizedPnL = new Dictionary<string, double>();
        private HashSet<string> sentExecutions = new HashSet<string>();
		private Dictionary<string, DateTime> recentCloseTimes = new Dictionary<string, DateTime>();
        private string baseUrl = "http://localhost:3001";
private string apiKey = "";
		private NTWindow loginWindow;
private TextBox usernameBox;
private PasswordBox passwordBox;
		private string connectedUser = "";
private string configFile = Path.Combine(
    Environment.GetFolderPath(Environment.SpecialFolder.MyDocuments),
    "J&J Company Bro",
    "config.json"
);
        protected override void OnStateChange()
        {
            if (State == State.SetDefaults)
            {
                Name = "JJCompanyBroAddon";
                Description = "J&J Company Bro AddOn - Accounts, Trades and Copier Sync";
            }
            else if (State == State.Active)
            {
                StartAddon();
            }
            else if (State == State.Terminated)
            {
                StopAddon();
            }
        }

 private void StartAddon()
{
    try
    {
        LoadConfig();

        if (string.IsNullOrEmpty(apiKey))
        {
            ShowLoginWindow();
            return;
        }

        foreach (Account account in Account.All)
            account.ExecutionUpdate += OnAccountExecutionUpdate;

        accountTimer = new Timer();
        accountTimer.Interval = 5000;
        accountTimer.Elapsed += (s, e) => SendAccounts();
        accountTimer.Start();

        commandTimer = new Timer();
        commandTimer.Interval = 1000;
        commandTimer.Elapsed += (s, e) => CheckCommands();
        commandTimer.Start();

        Print("JJCompanyBroAddon iniciado correctamente");
        SendAccounts();
    }
    catch (Exception ex)
    {
        Print("JJCompanyBroAddon Start error: " + ex.Message);
    }
}

        private void StopAddon()
        {
            try
            {
                foreach (Account account in Account.All)
                    account.ExecutionUpdate -= OnAccountExecutionUpdate;

                if (accountTimer != null)
                {
                    accountTimer.Stop();
                    accountTimer.Dispose();
                    accountTimer = null;
                }

                if (commandTimer != null)
                {
                    commandTimer.Stop();
                    commandTimer.Dispose();
                    commandTimer = null;
                }

                Print("JJCompanyBroAddon detenido");
            }
            catch (Exception ex)
            {
                Print("JJCompanyBroAddon Stop error: " + ex.Message);
            }
        }

	private void LoadConfig()
{
    try
    {
        string configDir = Path.GetDirectoryName(configFile);

        if (!Directory.Exists(configDir))
            Directory.CreateDirectory(configDir);

        Print("BUSCANDO CONFIG EN: " + configFile);

        if (!File.Exists(configFile))
        {
            Print("JJ Config no encontrada. Addon pendiente de login.");
            return;
        }

        string json = File.ReadAllText(configFile);
Match userMatch = Regex.Match(
    json,
    "\"username\"\\s*:\\s*\"([^\"]+)\""
);

if (userMatch.Success)
    connectedUser = userMatch.Groups[1].Value;

        Match match = Regex.Match(
            json,
            "\"apiKey\"\\s*:\\s*\"([^\"]+)\""
        );

        if (match.Success)
        {
            apiKey = match.Groups[1].Value;
            Print("JJ API Key cargada correctamente");
			Print("JJ Conectado como: " + connectedUser);
        }
        else
        {
            Print("JJ Config encontrada pero sin apiKey");
        }
    }
    catch (Exception ex)
    {
        Print("JJ LoadConfig error: " + ex.Message);
    }
}

private void SaveConfig(string newApiKey, string username)
{
    try
    {
        string configDir = Path.GetDirectoryName(configFile);

        if (!Directory.Exists(configDir))
            Directory.CreateDirectory(configDir);

        string json =
            "{" +
            "\"apiKey\":\"" + EscapeJson(newApiKey) + "\"," +
            "\"username\":\"" + EscapeJson(username) + "\"" +
            "}";

        File.WriteAllText(configFile, json);

        apiKey = newApiKey;

        Print("JJ Config guardada correctamente");
    }
    catch (Exception ex)
    {
        Print("JJ SaveConfig error: " + ex.Message);
    }
}
private void LoginAddon(string username, string password)
{
    try
    {
        string json =
            "{" +
            "\"username\":\"" + EscapeJson(username) + "\"," +
            "\"password\":\"" + EscapeJson(password) + "\"" +
            "}";

        using (WebClient client = new WebClient())
        {
            client.Headers[HttpRequestHeader.ContentType] = "application/json";

            string response = client.UploadString(
                baseUrl + "/api/addon/login",
                "POST",
                json
            );
Match userMatch = Regex.Match(
    response,
    "\"username\"\\s*:\\s*\"([^\"]+)\""
);
            Match match = Regex.Match(
                response,
                "\"apiKey\"\\s*:\\s*\"([^\"]+)\""
            );

            if (match.Success)
            {
                string newApiKey = match.Groups[1].Value;
               string loggedUser =
    userMatch.Success
        ? userMatch.Groups[1].Value
        : username;

SaveConfig(newApiKey, loggedUser);
              Print("JJ Addon conectado correctamente");
StartAddon();
            }
            else
            {
                Print("JJ Login error: no se encontró apiKey en respuesta");
            }
        }
    }
    catch (Exception ex)
    {
        Print("JJ LoginAddon error: " + ex.Message);
    }
}
private void LogoutAddon()
{
    try
    {
        if (File.Exists(configFile))
            File.Delete(configFile);

        apiKey = "";
        connectedUser = "";

        Print("JJ Sesión cerrada");

        ShowLoginWindow();
    }
    catch (Exception ex)
    {
        Print("JJ Logout error: " + ex.Message);
    }
}
        private void SendAccounts()
        {
            try
            {
				if (string.IsNullOrEmpty(apiKey))
{
    Print("JJ Addon no vinculado. Falta apiKey.");
    return;
}
                StringBuilder json = new StringBuilder();
                json.Append("{");
json.Append("\"apiKey\":\"" + apiKey + "\",");
json.Append("\"accounts\":[");

                bool first = true;

                foreach (Account account in Account.All)
                {
                    if (account == null)
                        continue;

                    string accountName = account.Name;

                    if (
                        accountName == "Backtest" ||
                        accountName == "Playback101" ||
                        accountName == "Sim101" ||
                        accountName == "SimAccount1"
                    )
                        continue;

                    int totalContracts = 0;
                    string positions = "";

                    foreach (Position pos in account.Positions)
                    {
                        if (pos == null || pos.MarketPosition == MarketPosition.Flat)
                            continue;

                        totalContracts += pos.Quantity;

                        positions += EscapeJson(pos.Instrument.FullName) + " " +
                                     pos.MarketPosition.ToString() + " x" +
                                     pos.Quantity.ToString() + " | ";
                    }

                    string broker = DetectBroker(accountName);

                    double balance = SafeGet(account, AccountItem.CashValue);
                    double realizedPnL = SafeGet(account, AccountItem.RealizedProfitLoss);

                    if (!lastRealizedPnL.ContainsKey(accountName))
                        lastRealizedPnL[accountName] = realizedPnL;

                    double unrealizedPnL = SafeGet(account, AccountItem.UnrealizedProfitLoss);
                    double trailingMaxDrawdown = SafeGet(account, AccountItem.TrailingMaxDrawdown);

                    if (!first)
                        json.Append(",");

                    first = false;

                    json.Append("{");
                    json.Append("\"name\":\"" + EscapeJson(accountName) + "\",");
                    json.Append("\"broker\":\"" + EscapeJson(broker) + "\",");
                    json.Append("\"balance\":" + ToInvariant(balance) + ",");
                    json.Append("\"pnl\":" + ToInvariant(realizedPnL) + ",");
                    json.Append("\"unrealizedPnl\":" + ToInvariant(unrealizedPnL) + ",");
                    json.Append("\"remainingDrawdown\":" + ToInvariant(trailingMaxDrawdown) + ",");
                    json.Append("\"contracts\":" + totalContracts + ",");
                    json.Append("\"positions\":\"" + EscapeJson(positions) + "\",");
                    json.Append("\"type\":\"slave\"");
                    json.Append("}");
                }

                json.Append("]}");

                PostJson(baseUrl + "/api/accounts/detect", json.ToString());
                Print("JJ Accounts sincronizadas");
            }
            catch (Exception ex)
            {
                Print("JJ SendAccounts error: " + ex.Message);
            }
        }

        private void OnAccountExecutionUpdate(object sender, ExecutionEventArgs e)
        {
            try
            {
                Account account = sender as Account;

                if (account == null || e == null || e.Execution == null || e.Execution.Order == null)
                    return;

                if (e.Execution.Order.Name != null && e.Execution.Order.Name.Contains("JJ_COPY"))
                    return;

                string executionId = e.Execution.ExecutionId;

                if (!string.IsNullOrEmpty(executionId) && sentExecutions.Contains(executionId))
                    return;

                if (!string.IsNullOrEmpty(executionId))
                    sentExecutions.Add(executionId);

                string symbol = e.Execution.Instrument.FullName;
                int quantity = e.Execution.Quantity;
                double price = e.Execution.Price;
                string tradeKey = account.Name + "|" + symbol;
				string closeKey = account.Name + "|" + symbol;
                string orderName = e.Execution.Order.Name == null ? "" : e.Execution.Order.Name.ToLower();

  string action;

Position currentPos = null;

foreach (Position p in account.Positions)
{
    if (p != null &&
        p.Instrument != null &&
        p.Instrument.FullName == symbol)
    {
        currentPos = p;
        break;
    }
}

bool isFlatAfterExecution =
    currentPos == null ||
    currentPos.MarketPosition == MarketPosition.Flat ||
    currentPos.Quantity == 0;

if (
    orderName.Contains("close") ||
    orderName.Contains("flatten") ||
    orderName.Contains("exit") ||
    orderName.Contains("atm")
)
{
    action = "CLOSE";
    recentCloseTimes[tradeKey] = DateTime.Now;
}
else
{
    action = e.Execution.Order.OrderAction.ToString().ToUpper();

    if (
        isFlatAfterExecution &&
        (action == "SELL" || action == "BUYTOCOVER")
    )
    {
        action = "CLOSE";
        recentCloseTimes[tradeKey] = DateTime.Now;

        Print("CIERRE DETECTADO AUTOMATICAMENTE: "
            + account.Name + " "
            + symbol);
    }

    if (
        recentCloseTimes.ContainsKey(tradeKey) &&
        (DateTime.Now - recentCloseTimes[tradeKey]).TotalSeconds <= 5 &&
        (
            action == "BUY" ||
            action == "SELL" ||
            action == "BUYTOCOVER" ||
            action == "SELLSHORT"
        )
    )
    {
        Print("Orden de cierre duplicada ignorada: "
            + account.Name + " "
            + symbol);

        return;
    }
}

if (action == "CLOSE")
{
    string closeSendKey = account.Name + "|" + symbol + "|CLOSE_LOCK";

    if (
        recentCloseTimes.ContainsKey(closeSendKey) &&
        (DateTime.Now - recentCloseTimes[closeSendKey]).TotalSeconds <= 10
    )
    {
        Print("CLOSE repetido bloqueado: " + account.Name + " " + symbol);
        return;
    }

    recentCloseTimes[closeSendKey] = DateTime.Now;
}

                if (action == "BUY" || action == "SELLSHORT")
                    entryPrices[tradeKey] = price;

                SendTrade(account.Name, symbol, action, quantity, price, e.Execution.Time);

              bool isClosingTrade =
    action == "CLOSE" ||
    action == "SELL" ||
    action == "BUYTOCOVER";

                if (isClosingTrade)
                {
                    double entryPrice = 0;

                    if (entryPrices.ContainsKey(tradeKey))
                        entryPrice = entryPrices[tradeKey];

                    double exitPrice = price;

                    Task.Delay(1500).ContinueWith(t =>
                    {
                        try
                        {
                            double currentRealized = SafeGet(account, AccountItem.RealizedProfitLoss);

                            double previousRealized = 0;

                            if (lastRealizedPnL.ContainsKey(account.Name))
                                previousRealized = lastRealizedPnL[account.Name];

                            double tradePnL = currentRealized - previousRealized;

                            lastRealizedPnL[account.Name] = currentRealized;

                            if (tradePnL == 0)
                            {
                                Print("TradePnL sigue en 0 despues del delay.");
                                return;
                            }

                            SendClosedTrade(
                                account.Name,
                                symbol,
                                action,
                                quantity,
                                tradePnL,
                                entryPrice,
                                exitPrice
                            );

                            if (entryPrices.ContainsKey(tradeKey))
                                entryPrices.Remove(tradeKey);
                        }
                        catch (Exception ex)
                        {
                            Print("ERROR delay closed trade: " + ex.Message);
                        }
                    });
                }
            }
            catch (Exception ex)
            {
                Print("JJ Trade listener error: " + ex.Message);
            }
        }
		
		private void ShowLoginWindow()
{
    try
    {
		if (!string.IsNullOrEmpty(apiKey))
{
    MessageBox.Show(
        "Conectado como: " + connectedUser,
        "J&J Company Bro"
    );
    return;
}
        if (loginWindow != null)
            return;

        loginWindow = new NTWindow();
        loginWindow.Caption = "J&J Company Bro Login";
        loginWindow.Width = 360;
        loginWindow.Height = 260;
        loginWindow.WindowStartupLocation = WindowStartupLocation.CenterScreen;

        StackPanel panel = new StackPanel();
        panel.Margin = new Thickness(20);

        TextBlock title = new TextBlock();
        title.Text = "Conectar Addon";
        title.FontSize = 20;
        title.Margin = new Thickness(0, 0, 0, 15);

        usernameBox = new TextBox();
        usernameBox.Height = 32;
        usernameBox.Margin = new Thickness(0, 0, 0, 10);
        usernameBox.Text = "";

        passwordBox = new PasswordBox();
        passwordBox.Height = 32;
        passwordBox.Margin = new Thickness(0, 0, 0, 15);

        Button loginButton = new Button();
        loginButton.Content = "Conectar";
        loginButton.Height = 36;

        loginButton.Click += (s, e) =>
        {
            string username = usernameBox.Text;
            string password = passwordBox.Password;

            if (string.IsNullOrEmpty(username) || string.IsNullOrEmpty(password))
            {
                Print("JJ Login: usuario y contraseña requeridos");
                return;
            }

            LoginAddon(username, password);

            if (!string.IsNullOrEmpty(apiKey))
            {
                loginWindow.Close();
                loginWindow = null;
            }
        };
		Button logoutButton = new Button();
logoutButton.Content = "Cambiar Cuenta";
logoutButton.Height = 36;
logoutButton.Margin = new Thickness(0, 10, 0, 0);

logoutButton.Click += (s, e) =>
{
    LogoutAddon();
};

        panel.Children.Add(title);

        panel.Children.Add(new TextBlock { Text = "Usuario o Email" });
        panel.Children.Add(usernameBox);

        panel.Children.Add(new TextBlock { Text = "Contraseña" });
        panel.Children.Add(passwordBox);

        panel.Children.Add(loginButton);
panel.Children.Add(logoutButton);
        loginWindow.Content = panel;
        loginWindow.Show();
    }
    catch (Exception ex)
    {
        Print("JJ ShowLoginWindow error: " + ex.Message);
    }
}

       private void SendTrade(string accountName, string symbol, string action, int quantity, double price, DateTime time)
{
    try
    {
		if (string.IsNullOrEmpty(apiKey))
{
    Print("JJ Trade no enviado. Falta apiKey.");
    return;
}
     string json =
    "{" +
    "\"apiKey\":\"" + apiKey + "\"," +
            "\"account\":\"" + EscapeJson(accountName) + "\"," +
            "\"symbol\":\"" + EscapeJson(symbol) + "\"," +
            "\"action\":\"" + EscapeJson(action) + "\"," +
            "\"quantity\":" + quantity + "," +
            "\"price\":" + ToInvariant(price) + "," +
            "\"time\":\"" + time.ToString("o") + "\"" +
            "}";

        // Ya no enviamos las ejecuciones reales a /api/copier/execute.
        // Esa ruta es para comandos del backend hacia Ninja, no para registrar trades.
        TryPostJson(baseUrl + "/api/trades/record", json);

        Print("Trade enviado a J&J: " + accountName + " " + symbol + " " + action + " x" + quantity + " @" + price);
    }
    catch (Exception ex)
    {
        Print("JJ SendTrade error: " + ex.Message);
    }
}

        private void SendClosedTrade(string accountName, string symbol, string side, int quantity, double pnl, double entryPrice, double exitPrice)
        {
            try
            {
				if (string.IsNullOrEmpty(apiKey))
{
    Print("JJ ClosedTrade no enviado. Falta apiKey.");
    return;
}
                string json =
    "{" +
    "\"apiKey\":\"" + apiKey + "\"," +
                    "\"account\":\"" + EscapeJson(accountName) + "\"," +
                    "\"symbol\":\"" + EscapeJson(symbol) + "\"," +
                    "\"side\":\"" + EscapeJson(side) + "\"," +
                    "\"quantity\":" + quantity + "," +
                    "\"entryPrice\":" + ToInvariant(entryPrice) + "," +
                    "\"exitPrice\":" + ToInvariant(exitPrice) + "," +
                    "\"pnl\":" + ToInvariant(pnl) +
                    "}";

                PostJson(baseUrl + "/api/trades/closed/send", json);

                Print("TRADE CERRADO ENVIADO: " + symbol + " PnL=" + pnl);
            }
            catch (Exception ex)
            {
                Print("ERROR ENVIANDO TRADE CERRADO: " + ex.Message);
            }
        }

        private void CheckCommands()
        {
            try
            {
                using (WebClient client = new WebClient())
                {
                    string json = client.DownloadString(baseUrl + "/api/ninja/commands");

                    if (string.IsNullOrEmpty(json) || json == "[]")
                        return;

                    if (json.Contains("COPY_TRADE"))
                    {
                        string targetAccount = ExtractValue(json, "\"account\":\"");
                        string symbol = ExtractValue(json, "\"symbol\":\"");
                        string actionText = ExtractValue(json, "\"action\":\"").ToUpper();
                        int quantity = ExtractInt(json, "\"quantity\":");

                        ExecuteCopyTrade(targetAccount, symbol, actionText, quantity);
                    }

                    if (json.Contains("PANIC_CLOSE"))
                    {
                        ExecutePanicClose(json);
                    }
                }
            }
            catch (Exception ex)
            {
                Print("Error leyendo comandos J&J: " + ex.Message);
            }
        }

        private void ExecuteCopyTrade(string targetAccount, string symbol, string actionText, int quantity)
        {
            try
            {
                foreach (Account account in Account.All)
                {
                    if (account.Name != targetAccount)
                        continue;

                    Instrument instrument = Instrument.GetInstrument(symbol);

                    if (instrument == null)
                    {
                        Print("Instrumento no encontrado: " + symbol);
                        return;
                    }

                    Position currentPos = null;

                    foreach (Position p in account.Positions)
                    {
                        if (p != null && p.Instrument.FullName == symbol)
                        {
                            currentPos = p;
                            break;
                        }
                    }

                    MarketPosition currentPosition = currentPos == null
                        ? MarketPosition.Flat
                        : currentPos.MarketPosition;

                    int currentQty = currentPos == null ? 0 : currentPos.Quantity;

                    actionText = actionText.ToUpper();

                    if (actionText == "CLOSE")
                    {
                        if (currentPosition == MarketPosition.Flat || currentQty <= 0)
                        {
                            Print("CLOSE ignorado: " + account.Name + " ya esta Flat en " + symbol);
                            SendPositionUpdate(account.Name, symbol, "FLAT", 0);
                            return;
                        }

                        OrderAction closeAction;

                        if (currentPosition == MarketPosition.Long)
                            closeAction = OrderAction.Sell;
                        else if (currentPosition == MarketPosition.Short)
                            closeAction = OrderAction.BuyToCover;
                        else
                            return;

                        Order closeOrder = account.CreateOrder(
                            instrument,
                            closeAction,
                            OrderType.Market,
                            OrderEntry.Automated,
                            TimeInForce.Day,
                            currentQty,
                            0,
                            0,
                            "",
                            "JJ_COPY_CLOSE_" + DateTime.Now.Ticks,
                            DateTime.MaxValue,
                            null
                        );

                        account.Submit(new[] { closeOrder });

                        SendPositionUpdate(account.Name, symbol, "CLOSE", currentQty);
                        Print("CLOSE ENVIADO A SLAVE: " + account.Name + " " + closeAction + " x" + currentQty + " " + symbol);
                        return;
                    }

                    OrderAction action;

                    if (actionText == "BUY")
                    {
                        action = OrderAction.Buy;
                    }
                    else if (actionText == "SELLSHORT")
                    {
                        action = OrderAction.SellShort;
                    }
                    else if (actionText == "SELL")
                    {
                        if (currentPosition == MarketPosition.Long && currentQty > 0)
                        {
                            action = OrderAction.Sell;
                            quantity = currentQty;
                        }
                        else
                        {
                            Print("SELL ignorado: no hay Long para cerrar en " + account.Name + " " + symbol);
                            return;
                        }
                    }
                    else if (actionText == "BUYTOCOVER")
                    {
                        if (currentPosition == MarketPosition.Short && currentQty > 0)
                        {
                            action = OrderAction.BuyToCover;
                            quantity = currentQty;
                        }
                        else
                        {
                            Print("BUYTOCOVER ignorado: no hay Short para cerrar en " + account.Name + " " + symbol);
                            return;
                        }
                    }
                    else
                    {
                        Print("Accion no reconocida: " + actionText);
                        return;
                    }

                    int finalQuantity = quantity <= 0 ? 1 : quantity;

                    Order order = account.CreateOrder(
                        instrument,
                        action,
                        OrderType.Market,
                        OrderEntry.Automated,
                        TimeInForce.Day,
                        finalQuantity,
                        0,
                        0,
                        "",
                        "JJ_COPY_" + DateTime.Now.Ticks,
                        DateTime.MaxValue,
                        null
                    );

                    account.Submit(new[] { order });

                    SendPositionUpdate(account.Name, symbol, actionText, finalQuantity);
                    Print("ORDEN ENVIADA A SLAVE: " + account.Name + " " + action + " x" + finalQuantity + " " + symbol);
                    return;
                }

                Print("Cuenta destino no encontrada: " + targetAccount);
            }
            catch (Exception ex)
            {
                Print("ERROR ExecuteCopyTrade: " + ex.Message);
            }
        }

        private void ExecutePanicClose(string json)
        {
            try
            {
                foreach (Account account in Account.All)
                {
                    foreach (Position p in account.Positions)
                    {
                        if (p.MarketPosition != MarketPosition.Flat)
                        {
                            account.Flatten(new Instrument[] { p.Instrument });
                            SendPositionUpdate(account.Name, p.Instrument.FullName, "CLOSE", p.Quantity);
                        }
                    }
                }

                Print("PANIC CLOSE ejecutado");
            }
            catch (Exception ex)
            {
                Print("PANIC CLOSE error: " + ex.Message);
            }
        }

        private void SendPositionUpdate(string accountName, string symbol, string action, int quantity)
        {
            try
            {
                string json =
                    "{" +
                    "\"account\":\"" + EscapeJson(accountName) + "\"," +
                    "\"symbol\":\"" + EscapeJson(symbol) + "\"," +
                    "\"action\":\"" + EscapeJson(action) + "\"," +
                    "\"quantity\":" + quantity +
                    "}";

                PostJson(baseUrl + "/api/accounts/position-update", json);
            }
            catch (Exception ex)
            {
                Print("Error enviando POSITION UPDATE: " + ex.Message);
            }
        }

        private void PostJson(string url, string json)
        {
            using (WebClient client = new WebClient())
            {
                client.Headers[HttpRequestHeader.ContentType] = "application/json";
                client.UploadString(url, "POST", json);
            }
        }

        private void TryPostJson(string url, string json)
        {
            try
            {
                PostJson(url, json);
            }
            catch (Exception ex)
            {
                Print("Ruta no disponible: " + url + " / " + ex.Message);
            }
        }

        private double SafeGet(Account account, AccountItem item)
        {
            try
            {
                return account.Get(item, Currency.UsDollar);
            }
            catch
            {
                return 0;
            }
        }

        private string DetectBroker(string accountName)
        {
            if (accountName.Contains("APEX"))
                return "Apex";

            if (accountName.Contains("MFFU"))
                return "MyFundedFutures";

            if (accountName.Contains("TDFY") || accountName.Contains("TDFYSL") || accountName.Contains("GCUPTDFY"))
                return "Tradefy";

            if (accountName.Contains("LFE") || accountName.Contains("LTE") || accountName.Contains("LFF"))
                return "Lucid";

            return "NinjaTrader";
        }

        private string EscapeJson(string value)
        {
            if (value == null)
                return "";

            return value.Replace("\\", "\\\\").Replace("\"", "\\\"");
        }

        private string ToInvariant(double value)
        {
            return value.ToString(System.Globalization.CultureInfo.InvariantCulture);
        }

        private string ExtractValue(string json, string marker)
        {
            int start = json.IndexOf(marker);

            if (start < 0)
                return "";

            start += marker.Length;
            int end = json.IndexOf("\"", start);

            if (end < 0)
                return "";

            return json.Substring(start, end - start);
        }

        private int ExtractInt(string json, string marker)
        {
            int start = json.IndexOf(marker);

            if (start < 0)
                return 1;

            start += marker.Length;
            int end = json.IndexOfAny(new char[] { ',', '}' }, start);

            if (end < 0)
                return 1;

            string value = json.Substring(start, end - start).Trim();
            int result;

            if (int.TryParse(value, out result))
                return result;

            return 1;
        }
    }
}