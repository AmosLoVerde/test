### Descrizione intuitiva
<br>
La dicitura <b>$\textit{NP-hard}$</b> non descrive, in senso stretto, una classe di problemi caratterizzata da un particolare modello di calcolo efficiente, come accade per $P$, $\textit{NP}$ o $\textit{PSPACE}$. Essa esprime invece una <b>nozione di durezza computazionale</b>: un problema è $\textit{NP-hard}$ se è almeno difficile quanto ogni problema in $\textit{NP}$, nel senso che ogni problema di $\textit{NP}$ può essere trasformato in esso mediante una riduzione polinomiale.
Quindi un problema $\textit{NP-hard}$ rappresenta, rispetto a $\textit{NP}$, un livello di difficoltà almeno pari al massimo noto all'interno di $\textit{NP}$: se si trovasse un algoritmo deterministico in tempo polinomiale per un qualunque problema $\textit{NP-hard}$, allora tutti i problemi in $\textit{NP}$ diventerebbero risolvibili in tempo polinomiale.
<br>
È essenziale osservare che un problema $\textit{NP-hard}$ <b>non è tenuto ad appartenere a $\textit{NP}$</b>: può non ammettere certificati verificabili in tempo polinomiale, può non essere un problema decisionale nel senso più stretto, e può perfino essere indecidibile. Se invece un problema è contemporaneamente in $\textit{NP}$ e $\textit{NP-hard}$, allora esso è $\textit{NP-complete}$.
<br>
In termini intuitivi, $\textit{NP-hard}$ raccoglie dunque i problemi ai quali l'intera difficoltà di $\textit{NP}$ può essere trasferita efficientemente tramite riduzioni polinomiali. Esempi canonici sono i problemi $\textit{NP-complete}$ come $\textit{SAT}$ o $\textit{3SAT}$, ma la nozione di $\textit{NP-hardness}$ include anche molti problemi di ottimizzazione e alcuni problemi che non si sa nemmeno se appartengano a $\textit{NP}$.

<hr style="margin: 2rem 0;">

### Descrizione formale

<div class="definition-box" style="--box-color: #7c3aed;" data-title="Definizione [1]">
$$A \leq_p B \iff \exists \text{ funzione }f:\lbrace 0,1\rbrace^*\to\lbrace 0,1\rbrace^*\text{ calcolabile in tempo polinomiale tale che }x\in A \iff f(x)\in B$$
</div>
La relazione $\leq_p$ è la <b>riduzione polinomiale many-one</b> (o riduzione di Karp). Essa formalizza l'idea che il problema decisionale $A$ non sia più difficile del problema decisionale $B$: infatti un algoritmo efficiente per $B$, combinato con la trasformazione polinomiale $f$, fornisce immediatamente un algoritmo efficiente anche per $A$.
<br>
<br>
<div class="definition-box" style="--box-color: #7c3aed;" data-title="Definizione [2]">
$$\textit{NP-hard} = \lbrace B\text{ | } \forall A\in \textit{NP}\text{, }A\leq_p B \rbrace$$
</div>
Quindi un problema $B$ è $\textit{NP-hard}$ se <b>ogni</b> problema decisionale in $\textit{NP}$ è riducibile a $B$ mediante una riduzione polinomiale many-one.
<br>
Più esplicitamente, la definizione afferma che per ogni linguaggio $A\in\textit{NP}$ esiste una funzione $f_A$ calcolabile in tempo polinomiale tale che, per ogni input $x$,
$$
x\in A \iff f_A(x)\in B.
$$
Questo implica che, se $B$ fosse decidibile deterministicamente in tempo polinomiale, allora ogni linguaggio in $\textit{NP}$ lo sarebbe, e dunque si avrebbe $P=\textit{NP}$.
<br>
È inoltre fondamentale distinguere tra $\textit{NP-hard}$ e $\textit{NP-complete}$:
$$
\textit{NP-complete}=\textit{NP}\cap \textit{NP-hard}.
$$
Questa identità mostra che la $\textit{NP-hardness}$, da sola, esprime soltanto una proprietà di durezza rispetto a $\textit{NP}$; per ottenere la completezza rispetto a $\textit{NP}$ bisogna aggiungere anche l'appartenenza a $\textit{NP}$.

<hr style="margin: 2rem 0;">

### Relazioni note con altre classi
<br>

* $\textit{NP-complete}=\textit{NP}\cap \textit{NP-hard}$

* $\textit{NP-complete}\subseteq \textit{NP-hard}$

* Se $A\in \textit{NP-hard}$ e $A\in \textit{NP}$, allora $A\in \textit{NP-complete}$

* Se $A\in \textit{NP-hard}$ e $A\in P$, allora $P=\textit{NP}$

* $\textit{NP-hard}\nsubseteq \textit{NP}$ in generale

* $\textit{NP-hard}\nsubseteq \textit{REC}$ in generale

* Esistono problemi decidibili che sono $\textit{NP-hard}$ ma non sono noti appartenere a $\textit{NP}$

* Esistono problemi indecidibili che sono $\textit{NP-hard}$


<hr style="margin: 2rem 0;">

### Relazioni ancora non note / problemi aperti
<br>

* $P \stackrel{?}{=} \textit{NP}$ (equivalentemente: esiste un problema $\textit{NP-hard}$ risolvibile deterministicamente in tempo polinomiale?)

* $\textit{NP} \stackrel{?}{=} \textit{co-NP}$ (equivalentemente: può esistere un problema naturale in $\textit{NP}\cap\textit{co-NP}$ che sia anche $\textit{NP-hard}$?)

* $\textit{FACTORING} \stackrel{?}{\in} \textit{NP-hard}$

* $\textit{GRAPH\ ISOMORPHISM} \stackrel{?}{\in} \textit{NP-hard}$

* $\textit{Euclidean\ Steiner\ Tree} \stackrel{?}{\in} \textit{NP}$ pur essendo noto $\textit{NP-hard}$
