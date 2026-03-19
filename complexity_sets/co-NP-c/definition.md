### Descrizione intuitiva
<br>
La <b>classe $\textit{co-NP-c}$</b> (abbreviazione di <i>co-NP-complete</i>) contiene i problemi decisionali che sono tra i più difficili all'interno di $\textit{co-NP}$ rispetto alle riduzioni polinomiali many-one.
Mentre nei problemi di $\textit{NP}$ tipicamente una istanza positiva ammette un certificato breve verificabile in tempo polinomiale, nei problemi di $\textit{co-NP}$ la prospettiva è complementare. In questo senso, un problema $\textit{co-NP-c}$ è, per $\textit{co-NP}$, il corrispettivo esatto di un problema $\textit{NP-c}$ per $\textit{NP}$.

<hr style="margin: 2rem 0;">

### Descrizione formale

<div class="definition-box" style="--box-color: #7c3aed;" data-title="Definizione [1]">
$$\textit{co-NP-c} = \lbrace A\text{ | } A\in \textit{co-NP} \wedge \forall B\in \textit{co-NP}\text{ . } B\preceq_p A \rbrace$$
</div>

* $A$ è un <b>problema decisionale</b>, cioè una funzione $A : I(A) \to \lbrace \text{yes, no}\rbrace$; per convenzione $\text{yes} = 1$, $\text{no} = 0$.
* $I(A)$ è l'<b>insieme delle istanze</b> ammissibili del problema $A$.
* $B$ è un generico <b>problema decisionale</b> appartenente alla classe $\textit{co-NP}$.
* Il simbolo $\preceq_p$ denota una <b>riduzione polinomiale many-one</b> (o riduzione di Karp): $B\preceq_p A$ significa che esiste una funzione calcolabile deterministicamente in tempo polinomiale $f$ tale che, per ogni istanza $x$, vale $x\in B \iff f(x)\in A$.
* Dire che $A\in \textit{co-NP}$ significa, per definizione, che il linguaggio complemento $\overline{A}$ appartiene a $\textit{NP}$.
<br>
Quindi un problema appartiene a $\textit{co-NP-c}$ se e solo se soddisfa simultaneamente due condizioni: appartiene a $\textit{co-NP}$, ed è almeno tanto difficile quanto ogni altro problema di $\textit{co-NP}$ rispetto alle riduzioni polinomiali many-one.
<br>
<br>
<div class="definition-box" style="--box-color: #7c3aed;" data-title="Definizione [2]">
$$\textit{co-NP} = \lbrace A\text{ | } \overline{A}\in \textit{NP} \rbrace$$
</div>
In forma equivalente, usando la caratterizzazione universale standard di $\textit{co-NP}$:
$$
\begin{align*}
\textit{co-NP} = \lbrace A&\text{ | } \exists c>0\text{, }\exists \text{ algoritmo deterministico }V_A\text{ tale che }x\in A \\
&\iff \forall y\in\lbrace 0,1\rbrace^{|x|^c}\text{ si ha }V_A(x,y)=1\text{ in tempo }O(|x|^c) \rbrace
\end{align*}
$$
La presenza del quantificatore universale $\forall$ esprime precisamente la natura duale di $\textit{co-NP}$ rispetto a $\textit{NP}$, dove compare invece il quantificatore esistenziale $\exists$. Pertanto, un linguaggio è in $\textit{co-NP-c}$ se e solo se è un problema di $\textit{co-NP}$ completo per l'intera classe rispetto a riduzioni polinomiali many-one.

<hr style="margin: 2rem 0;">

### Relazioni note con altre classi
<br>

* $\textit{co-NP-c}\subseteq \textit{co-NP}$

* Se $P\cap \textit{co-NP-c}\neq \varnothing$, allora $P=\textit{NP}=\textit{co-NP}$; in particolare, se esiste un problema $\textit{co-NP-c}$ appartenente a $P$, allora l'intera classe $\textit{co-NP}$ collassa a $P$

* Se $\textit{NP}\cap \textit{co-NP-c}\neq \varnothing$, allora $\textit{NP}=\textit{co-NP}$; equivalentemente, se un qualunque problema $\textit{co-NP-c}$ appartiene a $\textit{NP}$, allora tutte le classi $\textit{NP}$ e $\textit{co-NP}$ coincidono

* Ogni problema $\textit{co-NP-c}$ appartiene anche a classi più ampie che contengono $\textit{co-NP}$, quindi in particolare $\textit{co-NP-c}\subseteq \textit{PSPACE}\subseteq \textit{EXP}$


<hr style="margin: 2rem 0;">

### Relazioni ancora non note / problemi aperti
<br>

* $P \stackrel{?}{=} \textit{NP}$

* $\textit{NP} \stackrel{?}{=} \textit{co-NP}$

* $\textit{co-NP} \stackrel{?}{=} \textit{PSPACE}$

* $\textit{co-NP} \stackrel{?}{=} \textit{EXP}$

* Non è noto se qualche problema $\textit{co-NP-c}$ appartenga a $P$

* Non è noto se qualche problema $\textit{co-NP-c}$ appartenga a $\textit{NP}$ senza implicare il collasso $\textit{NP}=\textit{co-NP}$ ; in particolare, nessun problema $\textit{co-NP-c}$ naturale è noto essere in $\textit{NP}\cap \textit{co-NP}$
